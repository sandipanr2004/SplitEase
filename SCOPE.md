# Scope & Database Schema

## Anomaly Log

The core requirement of the `SplitEase` application revolves around robust ingestion of user-uploaded expense CSVs. Because user data is notoriously messy, the application implements a dedicated anomaly detection engine during the parsing phase. 

Every problem found in the CSV is logged and either automatically handled or presented to the user for manual review.

| CSV Problem | How Handled | Action Taken |
| :--- | :--- | :--- |
| **Missing Amount** | Automatic | The row is flagged as an anomaly, assigned an amount of `0.00`, and marked `Requires Review`. |
| **Negative Amount** | Automatic | Converted to its absolute (positive) value. Logged in the Anomaly report as `Absolute Value Applied`. |
| **Missing Currency** | Automatic | Defaults to `USD`. Logged in the Anomaly report as `Defaulted to USD`. |
| **Unrecognized Split Type** | Automatic | Defaults to `equal`. Logged in the Anomaly report as `Defaulted to Equal`. |
| **Malformed Date** | Automatic | Falls back to the current system date. Logged as `Defaulted to Current Date`. |
| **Missing Payer Name** | Manual | The row is imported but flagged in the Dashboard. The user must manually assign the payer in the UI before settlement calculation. |

## Database Schema

The application utilizes a relational **PostgreSQL** database to ensure strict referential integrity (e.g., expenses cannot exist without a valid group).

### 1. `users`
Stores registered user profiles.
- `uid` (VARCHAR, Primary Key)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `email` (VARCHAR)
- `phone` (VARCHAR)
- `avatar` (VARCHAR)

### 2. `groups`
Stores shared workspaces where expenses occur.
- `id` (VARCHAR, Primary Key)
- `name` (VARCHAR, Not Null)
- `members` (TEXT Array)
- `icon` (VARCHAR)
- `description` (TEXT)
- `owner_uid` (VARCHAR, Foreign Key -> `users.uid`)
- `currency` (VARCHAR)

### 3. `group_memberships`
Tracks when users join or leave specific groups.
- `id` (VARCHAR, Primary Key)
- `group_id` (VARCHAR, Foreign Key -> `groups.id`)
- `user_uid` (VARCHAR)
- `joined_at` (VARCHAR)
- `left_at` (VARCHAR)

### 4. `expenses`
The core entity representing a single transaction.
- `id` (VARCHAR, Primary Key)
- `group_id` (VARCHAR, Foreign Key -> `groups.id`)
- `description` (VARCHAR)
- `amount` (NUMERIC)
- `paid_by` (VARCHAR)
- `split_type` (VARCHAR)
- `date` (VARCHAR)
- `category` (VARCHAR)
- `currency` (VARCHAR)
- `exchange_rate` (NUMERIC)
- `is_anomaly` (BOOLEAN)
- `import_id` (VARCHAR)

### 5. `expense_splits`
Represents how an expense is divided among group members.
- `id` (VARCHAR, Primary Key)
- `expense_id` (VARCHAR, Foreign Key -> `expenses.id`)
- `user_uid` (VARCHAR)
- `amount` (NUMERIC)
- `type` (VARCHAR)

### 6. `settlements`
Tracks payments made between users to clear balances.
- `id` (VARCHAR, Primary Key)
- `group_id` (VARCHAR, Foreign Key -> `groups.id`)
- `paid_by` (VARCHAR)
- `paid_to` (VARCHAR)
- `amount` (NUMERIC)
- `method` (VARCHAR)
- `status` (VARCHAR)
- `date` (VARCHAR)

### 7. `import_reports` & `anomalies`
Stores metadata regarding bulk CSV imports and their associated data issues.
- **`import_reports`**: `id`, `group_id`, `date`, `rows_imported`, `issues_fixed`, `status`
- **`anomalies`**: `id`, `import_id`, `row_number`, `issue_type`, `original_value`, `action_taken`, `final_status`

### 8. `audit_logs`
An append-only table to track changes for expense traceability.
- `id`, `entity_id`, `action`, `user_uid`, `timestamp`, `details`
