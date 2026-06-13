# CSV Import Anomaly Report

When a user uploads a CSV of expenses to `SplitEase`, the application parses the data client-side using `PapaParse`. During this ingestion, the system evaluates each row against strict financial integrity rules. 

If any row violates these rules, the system generates an `Import Report`. This report is not just a raw log; it is actively presented to the user in the UI via the `FeatureImportHistory` and `FeatureAnomalyDashboard` components, allowing them to review or reverse the system's automated corrections.

## Sample Import Report Generation

Below is an example of what the system generates when a user uploads a messy bank export:

### The Uploaded CSV Data
```csv
Date,Description,Amount,PaidBy,Currency
2026-06-12,Uber Ride,-24.50,Alice,USD
2026-06-13,Dinner,150.00,,
invalid-date,Coffee,5.00,Bob,EUR
```

### The System Output (Anomaly Log)
When the system ingests the above CSV, it produces the following structured JSON report internally, which is then rendered visually in the Dashboard:

```json
{
  "importId": "import_7f8a9b",
  "timestamp": "2026-06-13T10:00:00Z",
  "summary": {
    "totalRows": 3,
    "issuesFixed": 4,
    "status": "Completed with Anomalies"
  },
  "anomalies": [
    {
      "rowNumber": 1,
      "description": "Uber Ride",
      "issueType": "Negative Amount",
      "originalValue": "-24.50",
      "actionTaken": "Absolute value applied.",
      "finalStatus": "Auto-Corrected"
    },
    {
      "rowNumber": 2,
      "description": "Dinner",
      "issueType": "Missing Payer",
      "originalValue": "null",
      "actionTaken": "Flagged for manual assignment.",
      "finalStatus": "Requires Review"
    },
    {
      "rowNumber": 2,
      "description": "Dinner",
      "issueType": "Missing Currency",
      "originalValue": "null",
      "actionTaken": "Defaulted to USD.",
      "finalStatus": "Auto-Corrected"
    },
    {
      "rowNumber": 3,
      "description": "Coffee",
      "issueType": "Malformed Date",
      "originalValue": "invalid-date",
      "actionTaken": "Defaulted to system current date (2026-06-13).",
      "finalStatus": "Auto-Corrected"
    }
  ]
}
```

### UI Interaction
Because Row 2 resulted in a `Requires Review` status, the user's dashboard will highlight the "Dinner" expense with a red warning icon, preventing the group from finalizing settlements until the user clicks on it and selects who paid for it.
