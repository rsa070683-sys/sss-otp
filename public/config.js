// Isang lugar lang ito para sa Firebase config. Ginagamit ng index.html at ng service worker.
// Kunin sa: Firebase Console -> Project settings -> General -> Your apps -> Web app (</>)
self.FIREBASE_CONFIG = {
  apiKey: "AIzaSyD4MKN9sN49968Sw9VL3GnRBZzTp5ieabU",
  authDomain: "sss-otp.firebaseapp.com",
  projectId: "sss-otp",
  storageBucket: "sss-otp.firebasestorage.app",
  messagingSenderId: "1072929603984",
  appId: "1:1072929603984:web:60cea7b49979992247f315"
};

// Kunin sa: Project settings -> Cloud Messaging -> Web Push certificates -> Generate key pair
self.VAPID_KEY = "BMD0Q-nZmeK46ghHihNKE0yX3hln4MUxQsoWg66sWViRtYCwS9OaI9Mmp0d59Qvsosq_nqfYOsHLuoIhXAoDngE";
