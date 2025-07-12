import AuthService from "./authService"

const API_BASE_URL = "http://10.198.218.8:3000" // Updated to match backend

const handleError = (error) => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  return "An unexpected error occurred"
}

class StockService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // Helper method to get user ID
  async getUserId() {
    const userId = await AuthService.getUserId()
    if (!userId) {
      throw new Error("User not logged in")
    }
    return userId
  }

  // Cache management
  getCacheKey(endpoint, params = {}) {
    return `${endpoint}_${JSON.stringify(params)}`
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  getCache(key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  clearCache() {
    this.cache.clear()
  }

  // Get user profile with family composition
  async getUserProfile(useCache = true) {
    try {
      const userId = await this.getUserId()
      const cacheKey = this.getCacheKey("user_profile", { userId })

      if (useCache) {
        const cached = this.getCache(cacheKey)
        if (cached) return cached
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch user profile")
      }

      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      const errorMessage = handleError(error)
      console.error("Error fetching user profile:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user stocks with product details
  async getUserStocks(useCache = true) {
    try {
      const userId = await this.getUserId()
      const cacheKey = this.getCacheKey("user_stocks", { userId })

      if (useCache) {
        const cached = this.getCache(cacheKey)
        if (cached) return cached
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/stocks`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch user stocks")
      }

      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      const errorMessage = handleError(error)
      console.error("Error fetching user stocks:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get comprehensive prediction data
  async getPredictionData(useCache = true) {
    try {
      const userId = await this.getUserId()
      const cacheKey = this.getCacheKey("prediction_data", { userId })

      if (useCache) {
        const cached = this.getCache(cacheKey)
        if (cached) return cached
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/prediction-data`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch prediction data")
      }

      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      const errorMessage = handleError(error)
      console.error("Error fetching prediction data:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Helper method to get current season
  getCurrentSeason() {
    const month = new Date().getMonth() + 1
    if (month >= 3 && month <= 5) return "spring"
    if (month >= 6 && month <= 8) return "summer"
    if (month >= 9 && month <= 11) return "autumn"
    return "winter"
  }

  // Prepare data for ML prediction API
  async preparePredictionPayload(additionalData = {}) {
    try {
      const predictionData = await this.getPredictionData()

      // Convert stocks to the format expected by ML API
      const stockObject = {}
      predictionData.stocks.forEach((stock, index) => {
        stockObject[`${stock.products.product_name.toLowerCase().replace(/\s+/g, "_")}`] = stock.quantity
      })

      const payload = {
        user_id: predictionData.user.user_id,
        region: additionalData.region || predictionData.user.region || "urban",
        season: additionalData.season || this.getCurrentSeason(),
        event: additionalData.event || "normal",
        family: {
          adult_male: additionalData.family?.adult_male ?? predictionData.user.family.adult_male,
          adult_female: additionalData.family?.adult_female ?? predictionData.user.family.adult_female,
          child: additionalData.family?.child ?? predictionData.user.family.child,
        },
        stock: stockObject,
      }

      return {
        payload,
        stocksData: predictionData.stocks, // Return original stocks for reference
      }
    } catch (error) {
      const errorMessage = handleError(error)
      console.error("Error preparing prediction payload:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Call ML prediction API
  async predictDepletion(additionalData = {}) {
    try {
      const { payload, stocksData } = await this.preparePredictionPayload(additionalData)

      console.log("Sending prediction request:", payload)

      const response = await fetch("https://jannatul03-grocy-genie-grocy-genie-lstm.hf.space/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const predictionResult = await response.json()

      if (!response.ok) {
        throw new Error(predictionResult.detail || "Prediction failed")
      }

      console.log("Prediction result:", predictionResult)

      return {
        prediction: predictionResult,
        stocks: stocksData,
        payload: payload,
      }
    } catch (error) {
      const errorMessage = handleError(error)
      console.error("Error predicting depletion:", errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Add items to stock (existing functionality)
  async addItemsToStock(items) {
    try {
      const userId = await this.getUserId()

      const response = await fetch(`${API_BASE_URL}/process-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: items,
          userId: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add items to stock")
      }

      // Clear cache after adding items
      this.clearCache()

      return data
    } catch (error) {
      const errorMessage = handleError(error)
      console.error("Error adding items to stock:", errorMessage)
      throw new Error(errorMessage)
    }
  }
}

export default new StockService()
