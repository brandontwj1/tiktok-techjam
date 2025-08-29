import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [accountType, setAccountType] = useState<'consumer' | 'creator'>('consumer');

  const isEmail = (input: string) => {
    return input.includes('@');
  };

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Implement Supabase login logic
      console.log('Login attempt:', { emailOrUsername, password });
      
      // Placeholder success
      Alert.alert('Success', 'Welcome back!');
    } catch (error: any) {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    }
  };

  const handleCreateAccount = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Implement Supabase sign up logic
      console.log('Sign up attempt:', { email, password, username, accountType });

      // Placeholder success
      Alert.alert('Success', `Welcome ${username}! Your ${accountType} account has been created. You can now login with your username and password.`);
    } catch (error: any) {
      console.log('Error in handleCreateAccount:', error);
      Alert.alert('Sign Up Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSignUp ? 'Create Your Account' : 'Login'}
      </Text>

      {isSignUp && (
        <View style={styles.accountTypeContainer}>
          <Text style={styles.accountTypeLabel}>Account Type</Text>
          <View style={styles.accountTypeToggle}>
            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'consumer' && styles.accountTypeButtonActive
              ]}
              onPress={() => setAccountType('consumer')}
            >
              <Text style={[
                styles.accountTypeButtonText,
                accountType === 'consumer' && styles.accountTypeButtonTextActive
              ]}>
                Consumer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'creator' && styles.accountTypeButtonActive
              ]}
              onPress={() => setAccountType('creator')}
            >
              <Text style={[
                styles.accountTypeButtonText,
                accountType === 'creator' && styles.accountTypeButtonTextActive
              ]}>
                Creator
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={username}
          onChangeText={setUsername}
        />
      )}

      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={email}
          onChangeText={setEmail}
        />
      )}

      {!isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="Username or Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        autoCorrect={false}
        spellCheck={false}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={isSignUp ? handleCreateAccount : handleLogin}
      >
        <Text style={styles.buttonText}>
          {isSignUp ? 'Create Account' : 'Log In'}
        </Text>
      </TouchableOpacity>

      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        </Text>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleButton}>
            {isSignUp ? 'Log In' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#4682b4',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
  },
  toggleButton: {
    color: '#4682b4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  accountTypeContainer: {
    marginBottom: 20,
  },
  accountTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  accountTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    padding: 4,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    backgroundColor: '#4682b4',
  },
  accountTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  accountTypeButtonTextActive: {
    color: '#fff',
  },
});