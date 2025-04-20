import { useState, useEffect } from "react"
import { Banner } from "./banner"
import { Button } from "./button"
import { Info } from "lucide-react"
import { setCookie, getCookie } from "../../utils/cookieUtils"
import { useAnalytics } from "../../hooks/useAnalytics"
import { Link } from "react-router-dom"

const CONSENT_COOKIE_NAME = "royal_transfer_cookie_consent"
const CONSENT_COOKIE_EXPIRY_DAYS = 365

export type CookieConsentType = "all" | "necessary" | "none"

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { trackEvent } = useAnalytics()

  // Check screen size for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    // Initial check
    checkMobile()
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Check if user has already set cookie preferences
  useEffect(() => {
    // Small delay to prevent banner from flashing if consent already exists
    const timer = setTimeout(() => {
      const consentCookie = getCookie(CONSENT_COOKIE_NAME)
      if (!consentCookie) {
        setIsVisible(true)
      } else {
        try {
          const savedPreferences = JSON.parse(consentCookie)
          // Apply saved preferences
          if (savedPreferences.analytics) {
            enableAnalytics()
          }
        } catch (error) {
          console.error("Error parsing consent cookie:", error)
          setIsVisible(true)
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Save consent preferences to cookie
  const saveConsent = (consentType: CookieConsentType) => {
    const preferences = {
      necessary: true,
      analytics: consentType === "all",
      marketing: consentType === "all",
      preferences: consentType === "all"
    }

    setCookie(
      CONSENT_COOKIE_NAME,
      JSON.stringify(preferences),
      CONSENT_COOKIE_EXPIRY_DAYS
    )
    
    trackEvent(
      "Cookie Consent",
      consentType === "all" ? "Accept All" : "Necessary Only",
      "",
      0,
      true
    )
    
    // Apply consent settings
    if (consentType === "all") {
      enableAnalytics()
    } else {
      disableAnalytics()
    }
    
    setIsVisible(false)
  }

  // Accept all cookies
  const acceptAll = () => {
    saveConsent("all")
  }

  // Accept only necessary cookies
  const acceptNecessary = () => {
    saveConsent("necessary")
  }

  // Enable analytics based on consent
  const enableAnalytics = () => {
    // Enable Google Analytics
    if (typeof window !== "undefined" && window["ga-disable-" + import.meta.env.VITE_GA_MEASUREMENT_ID]) {
      window["ga-disable-" + import.meta.env.VITE_GA_MEASUREMENT_ID] = false
    }
  }

  // Disable analytics based on consent
  const disableAnalytics = () => {
    // Disable Google Analytics
    if (typeof window !== "undefined") {
      window["ga-disable-" + import.meta.env.VITE_GA_MEASUREMENT_ID] = true
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 inset-x-0 z-[999] flex justify-center px-4 pointer-events-none">
      <Banner 
        rounded="pill"
        size="sm"
        className="max-w-max shadow-lg shadow-black/10 bg-white border-gray-200 pointer-events-auto"
      >
        {isMobile ? (
          // Mobile layout - stacked with Learn more above buttons
          <div className="w-full px-2 py-1">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-center">
                We use cookies for a better experience
              </p>
              {/* Learn more link positioned above buttons */}
              <Link 
                to="/cookie-policy"
                className="text-[10px] text-center text-gray-500 hover:text-gray-700 hover:underline mx-auto"
                onClick={() => trackEvent("Cookie Consent", "Learn More Click", "")}
              >
                Learn more
              </Link>
              <div className="flex justify-center items-center gap-2 w-full">
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  className="bg-black text-white hover:bg-gray-900 text-xs py-1 h-7 px-3 flex-1"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={acceptNecessary}
                  className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-xs py-1 h-7 px-3 flex-1"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Desktop layout - inline
          <div className="w-full px-2">
            <div className="flex items-center gap-4">
              <p className="text-sm whitespace-nowrap">
                We use cookies for a better experience
              </p>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  className="bg-black text-white hover:bg-gray-900 text-xs py-1 h-7 px-3"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={acceptNecessary}
                  className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-xs py-1 h-7 px-3"
                >
                  Reject
                </Button>
                <Link 
                  to="/cookie-policy"
                  className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                  onClick={() => trackEvent("Cookie Consent", "Learn More Click", "")}
                >
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        )}
      </Banner>
    </div>
  )
}