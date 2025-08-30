import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

export default function SessionDashboard() {
  const { sessionId } = useLocalSearchParams();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  const userId = getUserId();

  useEffect(() => {
    console.log('Session ID received:', sessionId);
    
    if (sessionId) {
      fetchSessionData();
    } else {
      Alert.alert('Error', 'No session ID provided');
      setLoading(false);
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('creator_id', userId)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        // For testing purposes, create mock data if session not found
        setSessionData({
          session_id: sessionId,
          creator_id: userId,
          status: 'completed',
          redemption_status: 'pending',
          earned_amount: 25.50,
          title: 'Live Session',
          duration_minutes: 45,
          viewer_count: 128,
          tips_received: 15.50,
          timestamp: new Date().toISOString(),
        });
      } else {
        setSessionData(data);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      Alert.alert('Error', 'Failed to fetch session data');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!sessionData || sessionData.redemption_status === 'redeemed') {
      Alert.alert('Error', 'This session has already been redeemed');
      return;
    }

    try {
      setRedeeming(true);

      const { error } = await supabase
        .from('sessions')
        .update({ 
          redemption_status: 'redeemed',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) throw error;

      Alert.alert(
        'Success', 
        `$${sessionData.earned_amount.toFixed(2)} SGD has been redeemed!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Update local state
              setSessionData(prev => ({
                ...prev,
                redemption_status: 'redeemed'
              }));
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error redeeming session:', error);
      Alert.alert('Error', 'Failed to redeem earnings. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading session data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canRedeem = sessionData.status === 'completed' && sessionData.redemption_status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Dashboard</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Session ID Display (for testing) */}
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>Session ID: {sessionId}</Text>
          <Text style={styles.debugText}>Creator ID: {userId}</Text>
        </View>

        {/* Session Info Card */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionIconContainer}>
              <Ionicons name="videocam" size={30} color="#2196F3" />
            </View>
            <View style={styles.sessionHeaderText}>
              <Text style={styles.sessionTitle}>{sessionData.title || 'Live Session'}</Text>
              <Text style={styles.sessionDate}>{formatDate(sessionData.timestamp)}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: sessionData.status === 'completed' ? '#E8F5E8' : '#FFF3E0' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: sessionData.status === 'completed' ? '#4CAF50' : '#FF9800' }
              ]}>
                {sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>Session Earnings</Text>
          <View style={styles.earningsDisplay}>
            <Text style={styles.earningsAmount}>${sessionData.earned_amount.toFixed(2)} SGD</Text>
            <View style={[
              styles.redemptionBadge,
              { backgroundColor: sessionData.redemption_status === 'redeemed' ? '#F5F5F5' : '#E8F5E8' }
            ]}>
              <Text style={[
                styles.redemptionText,
                { color: sessionData.redemption_status === 'redeemed' ? '#999' : '#4CAF50' }
              ]}>
                {sessionData.redemption_status === 'redeemed' ? 'Redeemed' : 'Available'}
              </Text>
            </View>
          </View>

          {canRedeem && (
            <TouchableOpacity
              style={styles.redeemButton}
              onPress={handleRedeem}
              disabled={redeeming}
            >
              {redeeming ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="cash" size={20} color="white" />
                  <Text style={styles.redeemButtonText}>Redeem Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Session Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Session Statistics</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#666" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>
                {sessionData.duration_minutes ? formatDuration(sessionData.duration_minutes) : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="eye" size={24} color="#666" />
              <Text style={styles.statLabel}>Viewers</Text>
              <Text style={styles.statValue}>{sessionData.viewer_count || 0}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={24} color="#666" />
              <Text style={styles.statLabel}>Tips Received</Text>
              <Text style={styles.statValue}>${(sessionData.tips_received || 0).toFixed(2)}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={24} color="#666" />
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={styles.statValue}>${sessionData.earned_amount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Earnings Breakdown</Text>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Base Rate</Text>
            <Text style={styles.breakdownValue}>
              ${((sessionData.earned_amount || 0) - (sessionData.tips_received || 0)).toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Tips & Bonuses</Text>
            <Text style={styles.breakdownValue}>${(sessionData.tips_received || 0).toFixed(2)}</Text>
          </View>
          
          <View style={[styles.breakdownItem, styles.totalRow]}>
            <Text style={styles.breakdownLabelTotal}>Total Earnings</Text>
            <Text style={styles.breakdownValueTotal}>${sessionData.earned_amount.toFixed(2)} SGD</Text>
          </View>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButtonHeader: {
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
  debugCard: {
    backgroundColor: '#FFF9C4',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F57F17',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    color: '#F57F17',
    fontFamily: 'monospace',
  },
  sessionCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 50,
    marginRight: 15,
  },
  sessionHeaderText: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  earningsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  earningsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  redemptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  redemptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  breakdownCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    paddingTop: 15,
    marginTop: 10,
  },
  breakdownLabelTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  breakdownValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});