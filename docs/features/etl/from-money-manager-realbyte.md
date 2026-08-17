# Migrating from MoneyManager (Realbyte)

ExTrack's CSV import wizard (**Settings → Data Management → Import from CSV**)
recognises a MoneyManager export automatically — this page only covers the export step the
wizard can't do for you.

**App:** [MoneyManager by Realbyte](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree)

## Export your data

1. Open MoneyManager and go to **More → Backup/Restore → Export**.
2. Choose **CSV** as the format and export **Expenses**.
3. Save or share the resulting `.csv` file to a location you can attach it from (Drive,
   email, or directly on-device).

## What the wizard expects

MoneyManager's export header row is:

```csv
Date,Account,Category,Subcategory,Note,INR,Income/Expense,Description,Amount,Currency,Account
```

`Account` appears twice — a genuine quirk of this export, not a mistake. ExTrack de-duplicates
the header automatically and shows the second column as `Account (2)`.

When you attach a file with this exact header row, the wizard shows **"Detected: MoneyManager
(Realbyte)"** and pre-fills the column mapping, category routing, and the `Income`/`Transfer`
ignore rules for you — review them on the next two screens, then import.
