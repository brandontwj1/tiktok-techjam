import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../utils/supabase'; // Adjust path as needed

// Mock function - Replace this with actual user ID retrieval
const getUserId = () => {
    // TODO: Replace with actual user ID from auth/session
    return '66f614a7-0a67-4f5e-8000-16c93c209055'; // <-- KEY IN YOUR USER ID HERE FOR DEMO
};

interface Transaction {
    transaction_id: string;
    type: string;
    user_id: string;
    receiver_id: string | null;
    amount: number;
    timestamp: string;
    status: string;
    session_id: string | null;
    receiver_username?: string;
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balance, setBalance] = useState(0);

    const userId = getUserId();

    useEffect(() => {
        fetchAllTransactions();
    }, []);

    const calculateWalletBalance = (transactions: any[]) => {
        if (!transactions || transactions.length === 0) return 0;

        return transactions.reduce((balance, transaction) => {
            // Only process transactions that are not failed
            if (transaction.status === 'fail') {
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

    const fetchAllTransactions = async () => {
        try {
            setLoading(true);

            // Fetch all transactions for this user
            const { data, error } = await supabase
                .from('transactions')
                .select(`
          *,
          receiver:receiver_id(username)
        `)
                .eq('user_id', userId)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            if (data) {
                // Process data to include receiver usernames
                const processedData = data.map(transaction => ({
                    ...transaction,
                    receiver_username: transaction.receiver?.username || null
                }));

                setTransactions(processedData);

                // Calculate and set balance
                const calculatedBalance = calculateWalletBalance(processedData);
                setBalance(calculatedBalance);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAllTransactions();
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getTransactionDisplay = (transaction: Transaction) => {
        // Check if transaction failed
        if (transaction.status === 'fail') {
            const receiverUsername = transaction.receiver_username || 'user';
            return {
                icon: 'close-circle',
                color: '#F44336',
                title: `Failed ${transaction.type === 'topup' ? 'Top Up' : `Gift to @${receiverUsername}`}`,
                subtitle: 'Transaction Failed',
                amount: `${transaction.amount}`,
                amountColor: '#F44336'
            };
        }
        
        if (transaction.type === 'topup') {
            return {
                icon: 'add-circle',
                color: '#4CAF50',
                title: 'Top Up',
                subtitle: 'Wallet Top Up',
                amount: `+${transaction.amount}`,
                amountColor: '#4CAF50'
            };
        } else if (transaction.type === 'gift') {
            return {
                icon: 'arrow-forward-circle',
                color: '#2196F3',
                title: `Gift to @${transaction.receiver_username || 'user'}`,
                subtitle: 'Gift Sent',
                amount: `-${transaction.amount}`,
                amountColor: '#FF6B6B'
            };
        }
        return {
            icon: 'help-circle',
            color: '#757575',
            title: 'Transaction',
            subtitle: transaction.type,
            amount: `${transaction.amount}`,
            amountColor: '#333'
        };
    };

    const getStatusBadge = (status: string) => {
        const statusStyles = {
            success: { backgroundColor: '#E8F5E9', color: '#4CAF50' },
            pending: { backgroundColor: '#FFF3E0', color: '#FF9800' },
            fail: { backgroundColor: '#FFEBEE', color: '#F44336' },
        };

        const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.pending;

        return (
            <View style={[styles.statusBadge, { backgroundColor: style.backgroundColor }]}>
                <Text style={[styles.statusText, { color: style.color }]}>
                    {status.toUpperCase()}
                </Text>
            </View>
        );
    };

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const display = getTransactionDisplay(item);

        return (
            <View style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                    <View style={styles.transactionIconContainer}>
                        <Ionicons name={display.icon as any} size={32} color={display.color} />
                    </View>
                    <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>{display.title}</Text>
                        <Text style={styles.transactionSubtitle}>{display.subtitle}</Text>
                        <View style={styles.transactionMeta}>
                            <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
                            <Text style={styles.transactionTime}> • {formatTime(item.timestamp)}</Text>
                        </View>
                    </View>
                    <View style={styles.transactionRight}>
                        <View>
                            <Text style={[styles.transactionAmount, { color: display.amountColor }]}>
                                {display.amount} 🪙
                            </Text>
                            <Text style={styles.transactionUsd}>
                                ≈ ${Math.abs(parseFloat(display.amount.replace('+', '').replace('-', ''))).toFixed(2)}
                            </Text>
                        </View>
                        {getStatusBadge(item.status)}
                    </View>
                </View>
            </View>
        );
    };

    const ListHeader = () => (
        <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>All Transactions</Text>
            <View style={styles.balanceContainer}>
                <View>
                    <Text style={styles.balanceAmount}>{balance.toFixed(0)} 🪙</Text>
                    <Text style={styles.balanceUsd}>${balance.toFixed(2)}</Text>
                </View>
            </View>
        </View>
    );

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color="#C4C4C4" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
        </View>
    );

    if (loading && !refreshing) {
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaction History</Text>
                <View style={styles.headerRight} />
            </View>

            <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.transaction_id}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2196F3']}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    headerRight: {
        width: 34, // Same width as back button for centering
    },
    listContent: {
        paddingBottom: 20,
    },
    listHeader: {
        backgroundColor: 'white',
        padding: 20,
        marginBottom: 10,
    },
    listHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 16,
        color: '#666',
    },
    balanceAmount: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2196F3',
    },
    balanceUsd: {
        fontSize: 14,
        color: '#999',
        marginTop: 2,
    },
    transactionCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginVertical: 5,
        padding: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    transactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    transactionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    transactionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionDate: {
        fontSize: 12,
        color: '#999',
    },
    transactionTime: {
        fontSize: 12,
        color: '#999',
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    transactionUsd: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginBottom: 5,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
    },
});