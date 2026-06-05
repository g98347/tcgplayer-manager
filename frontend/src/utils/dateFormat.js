export const formatDate = (dateString) => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // Check if date is invalid
  if (isNaN(date.getTime())) {
    // Try to parse as YYYY-MM-DD format
    const parts = dateString.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      const parsedDate = new Date(year, month, day)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    }
    return dateString // Return original if can't parse
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
