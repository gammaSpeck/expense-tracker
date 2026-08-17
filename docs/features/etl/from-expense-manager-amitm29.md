# Migrating from Money Manager & Expense Tracker (Amit Mohan)

ExTrack's CSV import wizard (**Settings → Data Management → Import from CSV**)
recognises an export from this app automatically — this page only covers the export step the
wizard can't do for you.

**App:** [Money Manager & Expense Tracker by Amit Mohan](https://play.google.com/store/apps/details?id=com.amitm29.am.dailyexpensesmanager)

## Export your data

1. Open the app and go to **Menu → Export/Backup → Export as CSV**.
2. Save or share the resulting `.csv` file to a location you can attach it from (Drive,
   email, or directly on-device).

## What the wizard expects

This app's export header row is:

```csv
Date,Category,Amount,Note,Type,Payment mode,To payment mode,Tags
```

When you attach a file with this exact header row, the wizard shows **"Detected: Money Manager
& Expense tracker (Amit Mohan)"** and pre-fills the column mapping and category routing for you
— review them on the next two screens, then import.
