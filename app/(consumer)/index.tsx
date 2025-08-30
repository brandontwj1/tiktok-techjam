import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../utils/supabase';

// Mock function - Replace this with actual user ID retrieval
const getUserId = () => {
  return '66f614a7-0a67-4f5e-8000-16c93c209055';
};


// Clear reduction function for calculating wallet balance
const calculateWalletBalance = (transactions: any[]) => {
  if (!transactions || transactions.length === 0) return 0;
  
  return transactions.reduce((balance, transaction) => {
    // Only process transactions that are not failed
    if (transaction.status === 'fail' || transaction.status.startsWith("Blocked")) {
      return balance; // Don't count failed transactions
    }
    
    // Add amount for topup transactions (success or pending)
    if (transaction.type === 'topup') {
      return balance + parseFloat(transaction.amount);
    }
    // Subtract amount for gift transactions (success or pending)
    if (transaction.type === 'gift') {
      return balance - parseFloat(transaction.amount);
    }
    return balance;
  }, 0);
};

export default function ConsumerHome() {
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [processingTopUp, setProcessingTopUp] = useState(false);

  const userId = getUserId();

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchTransactions();
    } else {
      Alert.alert('Configuration Required', 'Please set the user ID in getUserId() function');
      setLoading(false);
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // Fetch all transactions for balance calculation with receiver username
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select(`
          *,
          receiver:users!receiver_id(username)
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (allError) throw allError;

      if (allTransactions) {
        // Calculate balance using the reduction function
        const calculatedBalance = calculateWalletBalance(allTransactions);
        setBalance(calculatedBalance);

        // Update the balance in the users table
        await updateUserBalance(calculatedBalance);

        // Set recent transactions (first 5)
        setTransactions(allTransactions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to fetch transaction data');
    } finally {
      setLoading(false);
    }
  };

  const updateUserBalance = async (newBalance: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user balance:', error);
      }
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchUserData(), fetchTransactions()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  const handleSignOut = async () => {
    try {
      router.replace('/');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const topUpWallet = async () => {
    try {
      setProcessingTopUp(true);

      // Check if user has access (TRUE in access field)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('access')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;

      if (!userData?.access) {
        Alert.alert(
          'Transaction Failed',
          'Your account is currently restricted from making top-ups. Please contact support for assistance.'
        );
        return;
      }

      // Process the top-up
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          receiver_id: null,
          session_id: null,
          type: 'topup',
          amount: parseFloat(topUpAmount),
          timestamp: new Date().toISOString(),
          status: 'success',
        });

      if (error) throw error;

      // Success - show alert and refresh data
      Alert.alert('Success', `Your wallet has been topped up with ${topUpAmount} 🪙!`);
      setTopUpModalVisible(false);
      setTopUpAmount('');

      // Refresh transactions and balance
      await fetchTransactions();

    } catch (error) {
      console.error('Error topping up wallet:', error);
      Alert.alert('Error', 'Failed to process top-up. Please try again.');
    } finally {
      setProcessingTopUp(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTransactionDisplay = (transaction: any) => {
    // Check if transaction failed
    if (transaction.status === 'fail' || transaction.status.startsWith("Blocked")) {
      const receiverUsername = transaction.receiver?.username || 'user';
      return {
        icon: 'close-circle',
        color: '#F44336',
        text: `Failed ${transaction.type === 'topup' ? 'Top Up' : `Gift to @${receiverUsername}`}`,
        amount: `${transaction.amount} 🪙`
      };
    }
    
    if (transaction.type === 'topup') {
      return {
        icon: 'add-circle',
        color: '#4CAF50',
        text: 'Top Up',
        amount: `+${transaction.amount} 🪙`
      };
    } else if (transaction.type === 'gift') {
      const receiverUsername = transaction.receiver?.username || 'user';
      return {
        icon: 'arrow-forward-circle',
        color: '#2196F3',
        text: `Gift to @${receiverUsername}`,
        amount: `-${transaction.amount} 🪙`
      };
    }
    return {
      icon: 'help-circle',
      color: '#757575',
      text: 'Transaction',
      amount: `${transaction.amount} 🪙`
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {username || 'User'}</Text>
            <TouchableOpacity onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={60} color="#C4C4C4" />
          </View>
        </View>

        {/* Wallet Section */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet" size={40} color="#FF6B35" />
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setTopUpModalVisible(true)}
            >
              <Ionicons name="add-circle" size={40} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.walletTitle}>My Wallet</Text>
          </View>
          <Text style={styles.balanceLabel}>Available Balance:</Text>
          <Text style={styles.balanceAmount}>{balance.toFixed(0)} 🪙</Text>
          <Text style={styles.balanceUsd}>${balance.toFixed(2)}</Text>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(consumer)/transactions')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <Text style={styles.noTransactions}>No transactions yet</Text>
          ) : (
            transactions.map((transaction, index) => {
              const display = getTransactionDisplay(transaction);
              return (
                <View key={transaction.transaction_id || index} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Ionicons name={display.icon as any} size={30} color={display.color} />
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionTitle}>{display.text}</Text>
                      <Text style={styles.transactionDate}>{formatDate(transaction.timestamp)}</Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>{display.amount}</Text>
                    <Text style={styles.transactionUsd}>${parseFloat(transaction.amount).toFixed(2)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={topUpModalVisible}
        onRequestClose={() => setTopUpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Top Up Wallet</Text>

            <Text style={styles.modalLabel}>Enter amount of coins:</Text>
            <TextInput
              style={styles.modalInput}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              keyboardType="numeric"
              placeholder="0 🪙"
              placeholderTextColor="#999"
            />
            {topUpAmount && (
              <Text style={styles.modalUsdText}>≈ ${parseFloat(topUpAmount || '0').toFixed(2)}</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTopUpModalVisible(false);
                  setTopUpAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={topUpWallet}
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || processingTopUp}
              >
                {processingTopUp ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Top Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: 'white',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 16,
    color: '#FF6B6B',
    textDecorationLine: 'underline',
  },
  avatarContainer: {
    marginLeft: 10,
  },
  walletCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  walletIcon: {
    marginRight: 15,
  },
  addButton: {
    position: 'absolute',
    right: 0,
    top: -5,
  },
  walletTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  noTransactions: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 14,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceUsd: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionUsd: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  modalUsdText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
