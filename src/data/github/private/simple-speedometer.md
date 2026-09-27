# simple-speedometer

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/simple-speedometer.
- Purpose: Source implementation indicates these responsibilities: persists or queries application data.
- Observed capabilities: Persists or queries application data; Defines the Live Activity Manager type or service; Defines the Location Manager type or service
- Technology: Swift

## Repository metadata
- **Repository:** lst97/simple-speedometer
- **Visibility:** private
- **URL:** https://github.com/lst97/simple-speedometer
- **Default branch:** dev
- **Last updated:** 2025-06-10T13:05:08Z
- **Primary language:** Swift
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- Swift (405,430 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: persists or queries application data.
Evidence: `simple-speedometer/Models/TripData.swift`, `SpeedometerWidget/WidgetDataManager.swift`, `simple-speedometer/Managers/LiveActivityManager.swift`, `simple-speedometer/Managers/LocationManager.swift`, `simple-speedometer/Managers/SettingsManager.swift`, `simple-speedometer/Models/TripRecord.swift`, `SpeedometerWidget/LiveActivity/Models/TripPhaseManager.swift` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Persists or queries application data — Evidence: `simple-speedometer/Models/TripData.swift`, `SpeedometerWidget/WidgetDataManager.swift` (**inferred**)
- Defines the Live Activity Manager type or service — Evidence: `simple-speedometer/Managers/LiveActivityManager.swift` (**inferred**)
- Defines the Location Manager type or service — Evidence: `simple-speedometer/Managers/LocationManager.swift` (**inferred**)
- Defines the Settings Manager type or service — Evidence: `simple-speedometer/Managers/SettingsManager.swift` (**inferred**)
- Defines the Trip Data type or service — Evidence: `simple-speedometer/Models/TripData.swift` (**inferred**)
- Defines the Trip Record type or service — Evidence: `simple-speedometer/Models/TripRecord.swift` (**inferred**)
- Defines the Trip Phase Manager type or service — Evidence: `SpeedometerWidget/LiveActivity/Models/TripPhaseManager.swift` (**inferred**)
- Defines the Trip Manager type or service — Evidence: `SpeedometerWidget/LiveActivity/Models/TripPhaseManager.swift` (**inferred**)
- Defines the Widget Data Manager type or service — Evidence: `SpeedometerWidget/WidgetDataManager.swift` (**inferred**)

## Tracked files
- **86 tracked files** in total
- Source: 63; tests: 0; documentation: 4; configuration: 9; assets/other: 10

## Repository structure
- Inspected 60 source files from the cloned repository (bounded for safety).
- `simple-speedometer/` (41 tracked files)
- `simple-speedometer.xcodeproj/` (5 tracked files)
- `simple-speedometerTests/` (1 tracked files)
- `simple-speedometerUITests/` (2 tracked files)
- `SpeedometerWidget/` (34 tracked files)
- `simple-speedometer/LiveActivity/DrivingEvent.swift`
- `simple-speedometer/LiveActivity/SpeedometerActivityAttributes.swift`
- `simple-speedometer/Managers/LiveActivityManager.swift`
- `simple-speedometer/Managers/LocationManager.swift`
- `simple-speedometer/Managers/SettingsManager.swift`
- `simple-speedometer/Models/AppTheme.swift`
- `simple-speedometer/Models/SpeedData.swift`
- `simple-speedometer/Models/SpeedUnit.swift`
- `simple-speedometer/Models/TripData.swift`
- `simple-speedometer/Models/TripRecord.swift`
- `simple-speedometer/simple_speedometerApp.swift`
- `simple-speedometer/Views/Analytics/AnalyticsContentView.swift`
- `simple-speedometer/Views/Analytics/AnalyticsView.swift`
- `simple-speedometer/Views/Analytics/Charts/EnhancedTripChartsView.swift`
- `simple-speedometer/Views/Analytics/Components/FilterSelectionView.swift`
- `simple-speedometer/Views/Analytics/Components/GranularityControlView.swift`
- `simple-speedometer/Views/Analytics/Components/NavigationHeaderView.swift`
- `simple-speedometer/Views/Analytics/Components/TripRowView.swift`
- `simple-speedometer/Views/Analytics/Components/TripSummaryView.swift`
- `simple-speedometer/Views/Analytics/Components/UtilityViews.swift`

## Implementation and test evidence
- Persists or queries application data — Evidence: `simple-speedometer/Models/TripData.swift`, `SpeedometerWidget/WidgetDataManager.swift` (**inferred**)
- Defines the Live Activity Manager type or service — Evidence: `simple-speedometer/Managers/LiveActivityManager.swift` (**inferred**)
- Defines the Location Manager type or service — Evidence: `simple-speedometer/Managers/LocationManager.swift` (**inferred**)
- Defines the Settings Manager type or service — Evidence: `simple-speedometer/Managers/SettingsManager.swift` (**inferred**)
- Defines the Trip Data type or service — Evidence: `simple-speedometer/Models/TripData.swift` (**inferred**)
- Defines the Trip Record type or service — Evidence: `simple-speedometer/Models/TripRecord.swift` (**inferred**)
- Defines the Trip Phase Manager type or service — Evidence: `SpeedometerWidget/LiveActivity/Models/TripPhaseManager.swift` (**inferred**)
- Defines the Trip Manager type or service — Evidence: `SpeedometerWidget/LiveActivity/Models/TripPhaseManager.swift` (**inferred**)
- Defines the Widget Data Manager type or service — Evidence: `SpeedometerWidget/WidgetDataManager.swift` (**inferred**)

## Frameworks and technology stack
- Swift — Evidence: `SpeedometerWidget/AnalyticsSummaryWidget.swift`, `SpeedometerWidget/LiveActivity/Models/DrivingEvent.swift`, `SpeedometerWidget/LiveActivity/Models/SpeedUnit.swift`, `SpeedometerWidget/LiveActivity/Models/SpeedometerActivityAttributes.swift`, `SpeedometerWidget/LiveActivity/Models/TripPhaseManager.swift`, `SpeedometerWidget/LiveActivity/Views/DynamicIsland/AnalyticsStatsExpandedView.swift`, `SpeedometerWidget/LiveActivity/Views/DynamicIsland/CurrentSpeedExpandedView.swift`, `SpeedometerWidget/LiveActivity/Views/DynamicIsland/DynamicIslandCompactViews.swift`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
