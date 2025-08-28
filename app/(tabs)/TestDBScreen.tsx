import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabase';

interface TestRow {
  id: number;
  created_at: string;
  description: string;
}

export default function TestDBScreen() {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestRows();
  }, []);

  const fetchTestRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('test_table')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.log('Error fetching test_table:', error);
    } else if (data) {
      setRows(data);
    }
    setLoading(false);
  };

  const addTestRow = async () => {
    const { data, error } = await supabase
      .from('test_table')
      .insert([{ description: 'New row' }]);

    if (error) {
      console.log('Error adding test row:', error);
    } else if (data) {
      setRows((prevRows) => [...prevRows, ...data]);
    }
  };

  const deleteTestRow = async () => {
    const { data: maxRow, error: fetchError } = await supabase
      .from('test_table')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.log('Error fetching max id row:', fetchError);
      return;
    } else if (!maxRow) {
      console.log('No rows to delete');
      return;
    }

    const { data, error } = await supabase
      .from('test_table')
      .delete()
      .eq('id', maxRow.id);

    if (error) {
      console.log('Error deleting test row:', error);
    } else if (data) {
      setRows((prevRows) => prevRows.filter((row) => row.id !== 2));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Test Table</Text>
      <TouchableOpacity
        onPress={async () => {
          await addTestRow();
          fetchTestRows();
        }}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>Add Test Row</Text>
      </TouchableOpacity>
      <TouchableOpacity         onPress={async () => {
          await deleteTestRow();
          fetchTestRows();
        }} style={styles.addButton}>
        <Text style={styles.addButtonText}>Delete Test Row</Text>
      </TouchableOpacity>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text>ID: {item.id}</Text>
              <Text>Created At: {item.created_at}</Text>
              <Text>Description: {item.description}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#2f95dc',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
