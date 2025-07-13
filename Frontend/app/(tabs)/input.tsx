"use client"

import axios from "axios"
import * as ImagePicker from "expo-image-picker"
import { useEffect, useState } from "react"
import { Image } from "react-native"
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Camera, Upload, Users, MapPin, Calendar, Star } from "lucide-react-native"
import Animated, { FadeInUp } from "react-native-reanimated"
import { Button } from "@/components/ui/Button"
import authService from "@/services/authService"
import stockService from "@/services/stockService"

interface FamilyData {
  adult_male: number
  adult_female: number
  child: number
}

interface StockItem {
  product_id: string
  quantity: number
  stock_id: string
  user_id: string
  purchase_date: string
  predicted_finish_date: string | null
  actual_finish_date: string | null
  created_at: string
  household_events: string | null
  season: string | null
  products?: {
    product_name: string
    unit: string
  }
}

interface ProductPrediction {
  predicted_consumption: number
  predicted_finish_date: string
  predicted_finish_days: number
  predicted_finish_error: number
}

interface PredictionResult {
  predictions: {
    [productName: string]: ProductPrediction
  }
  user_id: string
}

export default function InputScreen() {
  const [manualText, setManualText] = useState("")
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // User profile data
  const [userProfile, setUserProfile] = useState<any>(null)

  // Override data for prediction
  const [region, setRegion] = useState("urban")
  const [season, setSeason] = useState("")
  const [event, setEvent] = useState("normal")
  const [family, setFamily] = useState<FamilyData>({
    adult_male: 1,
    adult_female: 1,
    child: 0,
  })

  const [showAdditionalFields, setShowAdditionalFields] = useState(false)
  const [isProcessingPrediction, setIsProcessingPrediction] = useState(false)

  // -----------------------------------------------
  // IMPORTANT: Make sure this matches your backend IP
  const host = "192.168.0.105:3000" // Updated to match your backend IP
  // ------------------------------------------------

  // Get current season
  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1
    if (month >= 3 && month <= 5) return "spring"
    if (month >= 6 && month <= 8) return "summer"
    if (month >= 9 && month <= 11) return "autumn"
    return "winter"
  }

  // Fetch user ID and profile
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const id = await authService.getUserId()
        console.log("User ID fetched:", id)
        setUserId(id)

        // Set default season
        setSeason(getCurrentSeason())

        // Try to fetch user profile
        if (id) {
          try {
            const profile = await stockService.getUserProfile()
            console.log("User profile fetched:", profile)
            setUserProfile(profile)

            // Set default values from profile
            setRegion(profile.region || "urban")
            setFamily({
              adult_male: profile.adult_male || 1,
              adult_female: profile.adult_female || 1,
              child: profile.child || 0,
            })
          } catch (profileError) {
            console.log("Profile API not available yet, using defaults")
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to get user information")
      }
    }
    fetchUserData()
  }, [])

  const updateStockPredictions = async (predictionResult: PredictionResult) => {
    try {
      console.log("Updating stock predictions in database using bulk update...")
      console.log("Using host:", host)
      console.log("Prediction data to send:", {
        userId: userId,
        predictions: predictionResult.predictions,
        season: season || getCurrentSeason(),
        household_events: event || "normal",
      })

      // Use the bulk update API that's working in your backend
      const response = await axios.post(
        `http://${host}/api/update-predictions`,
        {
          userId: userId,
          predictions: predictionResult.predictions,
          season: season || getCurrentSeason(),
          household_events: event || "normal",
        },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      console.log("Bulk update response:", response.data)

      return {
        successful: response.data.updated_count || 0,
        failed: response.data.failed_count || 0,
        total: response.data.total_stocks || 0,
      }
    } catch (error) {
      console.error("Error updating stock predictions:", error)
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
        })
      }
      throw error
    }
  }

  // Alternative: Direct database update without API call
  const updateStockPredictionsDirectly = async (predictionResult: PredictionResult, stocksData: StockItem[]) => {
    try {
      console.log("Attempting direct stock updates...")

      // Create individual update calls for each stock item
      const updatePromises: Promise<any>[] = []

      // Map prediction results to stock items
      Object.entries(predictionResult.predictions).forEach(([productName, prediction]) => {
        // Find matching stock items
        const matchingStocks = stocksData.filter((stock) => {
          const stockProductName = stock.products?.product_name?.toLowerCase()
          return stockProductName === productName.toLowerCase()
        })

        // Update each matching stock
        matchingStocks.forEach((stock) => {
          const updatePromise = axios.put(
            `http://${host}/api/stocks/${stock.stock_id}`,
            {
              predicted_finish_date: prediction.predicted_finish_date,
              season: season || getCurrentSeason(),
              household_events: event || "normal",
            },
            {
              timeout: 5000,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
          updatePromises.push(updatePromise)
        })
      })

      if (updatePromises.length === 0) {
        console.log("No matching stocks found for predictions")
        return { successful: 0, failed: 0, total: 0 }
      }

      // Execute all updates
      const results = await Promise.allSettled(updatePromises)

      const successful = results.filter((result) => result.status === "fulfilled").length
      const failed = results.filter((result) => result.status === "rejected").length

      console.log(`Direct updates completed: ${successful} successful, ${failed} failed`)

      return { successful, failed, total: updatePromises.length }
    } catch (error) {
      console.error("Error in direct stock updates:", error)
      throw error
    }
  }

  const predictDepletionDate = async (stockData: StockItem[]) => {
    if (!userId) {
      console.log("Missing userId for prediction")
      return
    }

    setIsProcessingPrediction(true)

    try {
      // Get comprehensive prediction data
      const result = await stockService.predictDepletion({
        region: region || "urban",
        season: season || getCurrentSeason(),
        event: event || "normal",
        family: family,
      })

      console.log("✅ Depletion prediction completed:", result)

      // Update the database with prediction results
      if (result.prediction && result.prediction.predictions) {
        try {
          // Try bulk update first
          let updateResult
          try {
            updateResult = await updateStockPredictions(result.prediction)
          } catch (bulkError) {
            console.log("Bulk update failed, trying direct updates...")
            // Fallback to direct updates
            updateResult = await updateStockPredictionsDirectly(result.prediction, result.stocks)
          }

          Alert.alert(
            "Prediction Complete",
            `Depletion dates calculated for ${Object.keys(result.prediction.predictions).length} products.\n\nDatabase updated: ${updateResult.successful} items successful${updateResult.failed > 0 ? `, ${updateResult.failed} failed` : ""}.`,
            [{ text: "OK" }],
          )
        } catch (updateError) {
          console.error("Failed to update database:", updateError)
          Alert.alert(
            "Prediction Complete",
            `Depletion dates calculated successfully!\n\nPredictions:\n${(
              Object.entries(result.prediction.predictions) as [string, ProductPrediction][]
            )
              .map(([product, pred]) => `• ${product}: ${pred.predicted_finish_date}`)
              .join("\n")}\n\nNote: Database update failed, but predictions are available.`,
            [{ text: "OK" }],
          )
        }
      } else {
        Alert.alert(
          "Prediction Complete",
          `Depletion prediction completed, but no specific predictions were returned.`,
          [{ text: "OK" }],
        )
      }
    } catch (error) {
      console.error("Error predicting depletion:", error)
      Alert.alert(
        "Prediction Error",
        `Could not calculate depletion dates: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      )
    } finally {
      setIsProcessingPrediction(false)
    }
  }

  const handleProceed = async () => {
    if (!selectedImageUri) {
      alert("No image selected")
      return
    }
    const formData = new FormData()
    formData.append("receiptImage", {
      uri: selectedImageUri,
      type: "image/jpeg",
      name: "receipt.jpg",
    } as any)

    try {
      const response = await axios.post(`http://${host}/process`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      console.log("Image response from backend:", response.data)

      // If the response contains stock data, predict depletion
      if (response.data?.data && Array.isArray(response.data.data)) {
        await predictDepletionDate(response.data.data)
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error uploading image:", error.message, error.response?.data)
      } else {
        console.error("Unknown error uploading image:", error)
      }
    }
  }

  const handleTakePhoto = async () => {
    console.log("Take Photo Clicked !")
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      alert("Camera permission is required!")
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      console.log(uri)
      setSelectedImageUri(uri)
    }
  }

  const handleUploadPhoto = async () => {
    console.log("Upload Photo Clicked !")
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      alert("Media library permission is required!")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      console.log(uri)
      setSelectedImageUri(uri)
    }
  }

  const handleSubmitText = async () => {
    if (manualText.trim() === "") {
      alert("Please enter some text before proceeding.")
      return
    }

    if (!userId) {
      alert("Error: User is not logged in.")
      return
    }

    console.log(`Submitting text: "${manualText}" for user: ${userId}`)

    try {
      // Use the stock service to add items
      const result = await stockService.addItemsToStock(manualText.trim())
      console.log("✅ Success from backend:", result)
      alert(result.message)
      setManualText("")

      // If the response contains stock data, predict depletion
      if (result?.data && Array.isArray(result.data)) {
        await predictDepletionDate(result.data)
      }
    } catch (error) {
      console.error("Error submitting text:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Could not process request."}`)
    }
  }

  const renderAdditionalFields = () => {
    if (!showAdditionalFields) return null

    return (
      <Animated.View entering={FadeInUp.delay(300)} style={styles.additionalFieldsContainer}>
        <Text style={styles.sectionTitle}>Prediction Settings</Text>

        {userProfile && (
          <View style={styles.profileDataContainer}>
            <Text style={styles.profileDataTitle}>Your Profile Data:</Text>
            <Text style={styles.profileDataText}>Region: {userProfile.region || "Not set"}</Text>
            <Text style={styles.profileDataText}>
              Family: {userProfile.adult_male || 0} adult males, {userProfile.adult_female || 0} adult females,{" "}
              {userProfile.child || 0} children
            </Text>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <MapPin size={20} color="#6BCF7F" />
            <Text style={styles.fieldLabel}>Region</Text>
          </View>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g., urban, rural"
            value={region}
            onChangeText={setRegion}
            placeholderTextColor="#A0AEC0"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <Calendar size={20} color="#6BCF7F" />
            <Text style={styles.fieldLabel}>Season</Text>
          </View>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g., spring, summer, autumn, winter"
            value={season}
            onChangeText={setSeason}
            placeholderTextColor="#A0AEC0"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <Star size={20} color="#6BCF7F" />
            <Text style={styles.fieldLabel}>Event</Text>
          </View>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g., normal, fasting, guests, sickness, travel, meal_off"
            value={event}
            onChangeText={setEvent}
            placeholderTextColor="#A0AEC0"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <Users size={20} color="#6BCF7F" />
            <Text style={styles.fieldLabel}>Family Composition</Text>
          </View>

          <View style={styles.familyInputs}>
            <View style={styles.familyField}>
              <Text style={styles.familyLabel}>Adult Males</Text>
              <TextInput
                style={styles.familyInput}
                value={family.adult_male.toString()}
                onChangeText={(text) => setFamily((prev) => ({ ...prev, adult_male: Number.parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.familyField}>
              <Text style={styles.familyLabel}>Adult Females</Text>
              <TextInput
                style={styles.familyInput}
                value={family.adult_female.toString()}
                onChangeText={(text) => setFamily((prev) => ({ ...prev, adult_female: Number.parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <View style={styles.familyField}>
              <Text style={styles.familyLabel}>Children</Text>
              <TextInput
                style={styles.familyInput}
                value={family.child.toString()}
                onChangeText={(text) => setFamily((prev) => ({ ...prev, child: Number.parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholderTextColor="#A0AEC0"
              />
            </View>
          </View>
        </View>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
        <Text style={styles.title}>Add Items</Text>
        <Text style={styles.subtitle}>Enter items manually or scan a receipt</Text>
        {userProfile && <Text style={styles.welcomeText}>Welcome, {userProfile.user_name}!</Text>}
      </Animated.View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.methodContent}>
          <TextInput
            style={styles.manualInput}
            placeholder="Type what you bought..."
            value={manualText}
            onChangeText={setManualText}
            placeholderTextColor="#A0AEC0"
          />

          <Button
            title="Prediction Settings"
            onPress={() => setShowAdditionalFields(!showAdditionalFields)}
            variant="outline"
            style={styles.toggleButton}
          />

          {renderAdditionalFields()}

          <View style={{ marginTop: 0 }}>
            <Button
              title={isProcessingPrediction ? "Processing..." : "Submit Text"}
              onPress={handleSubmitText}
              style={styles.primaryAction}
              disabled={isProcessingPrediction}
            />
          </View>

          <View style={styles.methodActions}>
            <Button
              title="Take Photo"
              onPress={handleTakePhoto}
              icon={<Camera size={20} color="#FFFFFF" />}
              style={styles.primaryAction}
            />
            <Button
              title="Upload Photo"
              onPress={handleUploadPhoto}
              variant="outline"
              icon={<Upload size={20} color="#6BCF7F" />}
            />
          </View>

          {selectedImageUri && (
            <View style={{ alignItems: "center", marginTop: 20 }}>
              <Image
                source={{ uri: selectedImageUri }}
                style={{ width: "100%", height: 350, borderRadius: 12 }}
                resizeMode="contain"
              />
              <View style={{ marginTop: 10, width: "100%" }}>
                <Button
                  title={isProcessingPrediction ? "Processing..." : "Proceed"}
                  onPress={handleProceed}
                  style={styles.primaryAction}
                  disabled={isProcessingPrediction}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FBFF",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter-Bold",
    color: "#2D3748",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter-Regular",
    color: "#718096",
    marginTop: 4,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    color: "#6BCF7F",
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  methodContent: {
    gap: 28,
  },
  methodActions: {
    gap: 16,
  },
  primaryAction: {
    width: "100%",
    paddingVertical: 16,
  },
  toggleButton: {
    width: "100%",
    paddingVertical: 12,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: "Inter-Regular",
    backgroundColor: "#FFFFFF",
    shadowColor: "#6BCF7F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  additionalFieldsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#6BCF7F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter-SemiBold",
    color: "#2D3748",
    marginBottom: 20,
    textAlign: "center",
  },
  profileDataContainer: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#6BCF7F",
  },
  profileDataTitle: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
    color: "#2D3748",
    marginBottom: 8,
  },
  profileDataText: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#4A5568",
    marginBottom: 4,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
    color: "#2D3748",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter-Regular",
    backgroundColor: "#F8FBFF",
  },
  familyInputs: {
    flexDirection: "row",
    gap: 12,
  },
  familyField: {
    flex: 1,
  },
  familyLabel: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    color: "#4A5568",
    marginBottom: 6,
    textAlign: "center",
  },
  familyInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: "Inter-Regular",
    backgroundColor: "#F8FBFF",
    textAlign: "center",
  },
})
