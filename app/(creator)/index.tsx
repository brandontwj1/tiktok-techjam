import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../utils/supabase';

// Mock function - Replace this with actual user ID retrieval
const getUserId = () => {
  return '66f614a7-0a67-4f5e-8000-16c93c209055';
};

// Calculate redeemable earnings from sessions
const calculateRedeemableEarnings = (sessions: any[]) => {
  if (!sessions || sessions.length === 0) return 0;
  
  return sessions.reduce((total, session) => {
    // Only count sessions that are completed and not yet redeemed
    if (session.status === 'completed' && session.redemption_status !== 'redeemed') {
      return total + parseFloat(session.earned_amount || 0);
    }
    return total;
  }, 0);
};

export default function CreatorHome() {
  const [username, setUsername] = useState('');
  const [redeemableEarnings, setRedeemableEarnings] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = getUserId();

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchSessions();
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

  const fetchSessions = async () => {
    try {
      setLoading(true);

      // Fetch all sessions for this creator
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('creator_id', userId)
        .order('timestamp', { ascending: false });

      if (sessionsError) throw sessionsError;

      if (sessionsData) {
        setSessions(sessionsData);
        
        // Calculate redeemable earnings
        const earnings = calculateRedeemableEarnings(sessionsData);
        setRedeemableEarnings(earnings);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'Failed to fetch session data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchUserData(), fetchSessions()]);
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getSessionStatusDisplay = (session: any) => {
    if (session.redemption_status === 'redeemed') {
      return {
        text: 'Redeemed',
        color: '#999',
        backgroundColor: '#F5F5F5'
      };
    }
    
    if (session.status === 'completed' && session.redemption_status !== 'redeemed') {
      return {
        text: 'Redeem Now',
        color: '#4CAF50',
        backgroundColor: '#E8F5E8'
      };
    }
    
    if (session.status === 'active') {
      return {
        text: 'Pending',
        color: '#FF9800',
        backgroundColor: '#FFF3E0'
      };
    }
    
    return {
      text: 'Pending',
      color: '#999',
      backgroundColor: '#F5F5F5'
    };
  };

  const handleSessionPress = (session: any) => {
    // Navigate to session dashboard with session ID
    router.push(`/(creator)/session-dashboard?sessionId=${session.session_id}`);
  };

  const handleRedeemNow = async (session: any) => {
    try {
      // Update session redemption status
      const { error } = await supabase
        .from('sessions')
        .update({ redemption_status: 'redeemed' })
        .eq('session_id', session.session_id);

      if (error) throw error;

      Alert.alert('Success', `${session.earned_amount} 🪙 has been redeemed!`);
      await fetchSessions(); // Refresh data
    } catch (error) {
      console.error('Error redeeming session:', error);
      Alert.alert('Error', 'Failed to redeem earnings. Please try again.');
    }
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
            <Text style={styles.greeting}>Hello, {username || 'User123'}</Text>
            <TouchableOpacity onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={60} color="#6B7280" />
          </View>
        </View>

        {/* Redeemable Earnings Section */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View style={styles.earningsIconContainer}>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={24} color="#FF6B35" />
              </View>
              <View style={styles.moneyIcon}>
                <Ionicons name="cash" size={20} color="#4CAF50" />
              </View>
            </View>
            <Text style={styles.earningsTitle}>Redeemable{'\n'}Earnings</Text>
          </View>
          <Text style={styles.balanceLabel}>Available Balance:</Text>
          <Text style={styles.balanceAmount}>${redeemableEarnings.toFixed(2)} SGD</Text>
        </View>

        {/* Sessions */}
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>Sessions</Text>

          {sessions.length === 0 ? (
            <Text style={styles.noSessions}>No sessions yet</Text>
          ) : (
            sessions.map((session, index) => {
              const statusDisplay = getSessionStatusDisplay(session);
              const isRedeemable = session.status === 'completed' && session.redemption_status !== 'redeemed';
              
              return (
                <TouchableOpacity
                  key={session.session_id || index}
                  style={styles.sessionItem}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionLeft}>
                    <View style={styles.sessionIconContainer}>
                      <Ionicons name="videocam" size={24} color="#2196F3" />
                    </View>
                    <View style={styles.sessionDetails}>
                      <Text style={styles.sessionTitle}>Live</Text>
                      <Text style={styles.sessionDate}>{formatDate(session.timestamp)}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: statusDisplay.backgroundColor }
                    ]}
                    onPress={isRedeemable ? () => handleRedeemNow(session) : () => handleSessionPress(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                      {statusDisplay.text}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
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
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 2,
  },
  earningsCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
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
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  earningsIconContainer: {
    position: 'relative',
    marginRight: 15,
  },
  walletIcon: {
    backgroundColor: '#FFF0E6',
    padding: 12,
    borderRadius: 12,
  },
  moneyIcon: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    backgroundColor: '#E8F5E8',
    padding: 6,
    borderRadius: 8,
  },
  earningsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    lineHeight: 24,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionsSection: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  noSessions: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 50,
    marginRight: 16,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: '#999',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
});