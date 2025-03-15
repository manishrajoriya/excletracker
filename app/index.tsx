import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'

const index = () => {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.push("/sidebar")}>
        <Text>Go to sidebar</Text>
      </TouchableOpacity>
    </View>
  )
}

export default index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})