# TODO: Integrate Study Table Data into Planner Page

## Approved Plan
- Fetch data from "Study" table (columns: Subject, Topic, Status, Date, Start, Duration)
- Map to Planner session format: title=Topic, subject=Subject, date=Date, startTime=Start, duration=Duration, type='study', color based on Status
- Replace hardcoded sessions in Planner.jsx with fetched data
- Handle date parsing from string to Date object
- Set color based on Status: Very Important=red, Not so Important=green, Medium=orange, default=blue

## Steps
- [x] Modify Planner.jsx to import supabase
- [x] Add useEffect to fetch data from "Study" table on component mount
- [x] Map fetched data to session objects
- [x] Replace hardcoded sessions state with fetched data
- [x] Ensure dates are parsed correctly (e.g., new Date(session.Date))
- [x] Handle any errors in fetching data
- [ ] Test the planner page to verify data displays on correct dates
