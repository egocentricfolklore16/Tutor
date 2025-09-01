import React from 'react'
import QuickActions from './QuickActions'
import RecentActivity from './RecentActivity'
import StudyStats from './StudyStats'
import StudyStreak from './StudyStreak'
import UpcomingSession from './UpcomingSession'
import AISuggestions from './AISuggestions'

function Overview() {
  return (
    <>
    <StudyStats />
    <UpcomingSession />
    <StudyStreak />
    <QuickActions />
    <RecentActivity />
    <AISuggestions />
    </>
  )
}

export default Overview