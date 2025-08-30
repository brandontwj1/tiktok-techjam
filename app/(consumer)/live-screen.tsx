import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { evaluateTransaction } from '../../risk_logic/transaction_risk_logic';
import { supabase } from '../../utils/supabase';

// Demo configuration - Replace with actual values
const getSessionId = () => {
  return '62c47ed7-260f-4f60-ba21-a5ba04aab090'; // Replace with actual session ID
};

const getReceiverId = () => {
  return 'c1441d77-8542-4289-bf96-f61600caa124'; // Replace with actual receiver (creator) ID
};

const getUserId = () => {
  return '66f614a7-0a67-4f5e-8000-16c93c209055';
};

// Calculate wallet balance from transactions
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

export default function LiveScreen() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftAmount, setGiftAmount] = useState('');
  const [sendingGift, setSendingGift] = useState(false);

  const userId = getUserId();
  const sessionId = getSessionId();
  const receiverId = getReceiverId();

  useEffect(() => {
    fetchUserBalance();
  }, []);

  const fetchUserBalance = async () => {
    try {
      setLoading(true);

      // Fetch all transactions to calculate balance
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      if (transactions) {
        const calculatedBalance = calculateWalletBalance(transactions);
        setBalance(calculatedBalance);

        // Update the balance in the users table
        await updateUserBalance(calculatedBalance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      Alert.alert('Error', 'Failed to fetch balance');
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

  const sendGift = async () => {
    try {
      setSendingGift(true);
      const amount = parseFloat(giftAmount);

      // Check if user has access
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('access')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;

      if (!userData?.access) {
        Alert.alert(
          'Transaction Failed',
          'Your account is currently restricted from sending gifts. Please contact support for assistance.'
        );
        return;
      }

      // Check if user has enough balance
      if (balance < amount) {
        Alert.alert(
          'Insufficient Balance',
          `You don't have enough coins. Your current balance is ${balance.toFixed(0)} coins.`
        );
        return;
      }

      // Create and evaluate gift transaction
      const failure = await evaluateTransaction({
        user_id: userId,
        receiver_id: receiverId,
        session_id: sessionId,
        amount,
        timestamp: new Date().toISOString(),
        type: 'gift',
      });

      if (failure) {
        Alert.alert('Gift Blocked', 'Your gift could not be processed due to risk rules.');
      }

      // Success - show alert and refresh balance
      Alert.alert('Gift Sent!', `You sent ${amount} coins as a gift!`);
      setGiftModalVisible(false);
      setGiftAmount('');

      // Refresh balance
      await fetchUserBalance();

    } catch (error) {
      console.error('Error sending gift:', error);
      Alert.alert('Error', 'Failed to send gift. Please try again.');
    } finally {
      setSendingGift(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1744" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.liveIndicator}>🔴 LIVE: @jamestheweener</Text>
          <Text style={styles.viewerCount}>1.2K watching</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Video Area - Mock */}
      <View style={styles.videoArea}>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={80} color="#666" />
          <Text style={styles.videoText}>Live Stream</Text>
        </View>
      </View>

      {/* Chat Area */}
      <View style={styles.chatArea}>
        <Text style={styles.chatMessage}>User123: Amazing stream! 🔥</Text>
        <Text style={styles.chatMessage}>Viewer456: Love this content ❤️</Text>
        <Text style={styles.chatMessage}>Fan789: Keep it up! 👏</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.balanceContainer}>
          <Ionicons name="wallet" size={20} color="white" />
          <Text style={styles.balanceText}>{balance.toFixed(0)} 🪙</Text>
        </View>

        <TouchableOpacity
          style={styles.sendGiftButton}
          onPress={() => setGiftModalVisible(true)}
        >
          <Ionicons name="gift" size={24} color="white" />
          <Text style={styles.sendGiftText}>Send Gift</Text>
        </TouchableOpacity>
      </View>

      {/* Gift Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={giftModalVisible}
        onRequestClose={() => setGiftModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Gift</Text>

            <View style={styles.balanceInfo}>
              <Text style={styles.modalBalanceText}>
                Your balance: {balance.toFixed(0)} 🪙
              </Text>
            </View>

            <Text style={styles.modalLabel}>Enter gift amount:</Text>
            <TextInput
              style={styles.modalInput}
              value={giftAmount}
              onChangeText={setGiftAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
            />

            <View style={styles.quickAmounts}>
              <TouchableOpacity
                style={styles.quickAmountButton}
                onPress={() => setGiftAmount('10')}
              >
                <Text style={styles.quickAmountText}>10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAmountButton}
                onPress={() => setGiftAmount('50')}
              >
                <Text style={styles.quickAmountText}>50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAmountButton}
                onPress={() => setGiftAmount('100')}
              >
                <Text style={styles.quickAmountText}>100</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setGiftModalVisible(false);
                  setGiftAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={sendGift}
                disabled={!giftAmount || parseFloat(giftAmount) <= 0 || sendingGift}
              >
                {sendingGift ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Send Gift</Text>
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
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  liveIndicator: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewerCount: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
  },
  videoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  videoText: {
    color: '#666',
    fontSize: 18,
    marginTop: 10,
  },
  chatArea: {
    height: 120,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  chatMessage: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  balanceContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  balanceText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
    fontWeight: '500',
  },
  balanceUsdText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
    opacity: 0.8,
  },
  sendGiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1744',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  sendGiftText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  balanceInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalBalanceText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalBalanceUsd: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
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
    marginBottom: 15,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickAmountButton: {
    backgroundColor: '#FF1744',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  quickAmountText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#FF1744',
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
});