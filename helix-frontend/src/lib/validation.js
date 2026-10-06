export const emailRegex = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/

export const phoneRegex = /^[6-9]\d{9}$/

export const isValidEmail = (email) => {
  if (!email) return false
  return emailRegex.test(email.trim())
}

export const isValidPhone = (phone) => {
  if (!phone) return false
  return phoneRegex.test(phone.trim())
}

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/