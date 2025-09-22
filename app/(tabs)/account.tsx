import { supabase } from '@/lib/supabase';
import { Button, Text } from '@rneui/themed';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }
      setUser(data.user);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text h4 style={styles.header}>
        Account
      </Text>

      <Text style={styles.email}>{user?.email}</Text>

      <Button
        title="Sign Out"
        type="outline"
        onPress={() => supabase.auth.signOut()}
        containerStyle={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  email: {
    marginBottom: 24,
    fontSize: 16,
  },
  button: {
    width: '60%',
  },
});
