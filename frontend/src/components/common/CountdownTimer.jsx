// frontend/src/components/common/CountdownTimer.jsx
// Countdown timer component for showing time until delivery expiration
import { useEffect, useState } from 'react'

export default function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!targetDate) return

    const target = new Date(targetDate)
    const now = new Date()
    
    // Calculate initial time left
    const diff = target - now
    if (diff <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
      return
    }

    const timer = setInterval(() => {
      const now = new Date()
      const diff = target - now
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        clearInterval(timer)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, expired: false })
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  if (!timeLeft) {
    return <span className="text-muted">Calculating...</span>
  }

  if (timeLeft.expired) {
    return <span className="text-danger">Expired</span>
  }

  const parts = []
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`)
  if (timeLeft.hours > 0 || parts.length > 0) parts.push(`${timeLeft.hours}h`)
  if (timeLeft.minutes > 0 || parts.length > 0) parts.push(`${timeLeft.minutes}m`)
  parts.push(`${timeLeft.seconds}s`)

  return (
    <span className="text-info me-2">
      {parts.join(' ')} left
    </span>
  )
}