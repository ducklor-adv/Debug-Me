# Debug-me Revolution — Task Management Flowchart Diagram

> แผนผังระบบจัดการ Task ของ Debug-me: Personal Life Operating System

---

## 1. ภาพรวมระบบ Task Management (System Overview)

```mermaid
flowchart TB
    subgraph DataLayer["💾 Data Layer (Firestore)"]
        AppData[("appData Document<br/>users/{uid}/config/appData")]
        DailyRecords[("dailyRecords Collection<br/>users/{uid}/dailyRecords/{id}")]
    end

    subgraph StateOwner["⚛️ State Owner (App.tsx)"]
        Tasks["tasks: Task[]"]
        TaskGroups["taskGroups: TaskGroup[]"]
        Milestones["milestones: Milestone[]"]
        ScheduleTemplates["scheduleTemplates"]
    end

    subgraph Views["🖥️ UI Views"]
        Dashboard["Dashboard<br/>(ดูงานวันนี้)"]
        TaskMgr["TaskManager<br/>(จัดการ task/group)"]
        Planner["DailyPlanner<br/>(จัดตารางเวลา)"]
        Calendar["CalendarView<br/>(ดูปฏิทิน)"]
        Analytics["Analytics<br/>(สถิติ)"]
        Projects["ProjectManager<br/>(จัดการโปรเจค)"]
        FocusTimer["FocusTimer<br/>(Pomodoro)"]
    end

    subgraph SharedComponents["🧩 Shared Components"]
        TaskEditModal["TaskEditModal<br/>(สร้าง/แก้ไข task)"]
        SearchView["SearchView<br/>(ค้นหา task)"]
    end

    AppData <-->|"subscribeAppData<br/>saveAppData"| Tasks
    AppData <-->|"subscribeAppData<br/>saveAppData"| TaskGroups

    Tasks --> Dashboard
    Tasks --> TaskMgr
    Tasks --> Planner
    Tasks --> Calendar
    Tasks --> Analytics
    Tasks --> Projects

    TaskGroups --> Dashboard
    TaskGroups --> TaskMgr
    TaskGroups --> Planner

    TaskMgr --> TaskEditModal
    Dashboard -->|"toggle complete"| DailyRecords
    FocusTimer -->|"save session"| DailyRecords
```

---

## 2. Data Model (โครงสร้างข้อมูล)

```mermaid
erDiagram
    APP_DATA ||--o{ TASK : contains
    APP_DATA ||--o{ TASK_GROUP : contains
    APP_DATA ||--o{ MILESTONE : contains
    APP_DATA ||--|| SCHEDULE_TEMPLATES : has
    TASK }o--|| TASK_GROUP : "category → group.key"
    TASK ||--o{ SUB_TASK : has
    TASK ||--o{ TASK_ATTACHMENT : has
    TASK ||--o| RECURRENCE : has
    TASK ||--o| LOCATION_REMINDER : has
    TASK ||--o{ DAILY_RECORD : "tracked by"
    TASK ||--o{ FOCUS_SESSION : "timed by"
    SCHEDULE_TEMPLATES ||--o{ TIME_SLOT : contains
    TIME_SLOT }o--|| TASK_GROUP : "groupKey → group.key"
    TIME_SLOT }o--o{ TASK : "assignedTaskIds"
    PROJECT ||--o{ TASK : "taskIds[]"

    TASK {
        string id PK
        string title
        string description
        Priority priority "1-8"
        boolean completed
        string startDate "YYYY-MM-DD"
        string endDate "YYYY-MM-DD"
        string category "→ TaskGroup.key"
        string notes
        DayType[] dayTypes "workday/saturday/sunday"
        string startTime "HH:MM"
        string endTime "HH:MM"
        number estimatedDuration "minutes"
        string completedAt "ISO timestamp"
    }

    TASK_GROUP {
        string key PK
        string label
        string emoji
        string color "GROUP_COLORS key"
        string icon "icon key"
        number size "circle size px"
        string categoryKey "→ Category.key"
    }

    SUB_TASK {
        string id PK
        string title
        boolean completed
        string note
    }

    RECURRENCE {
        string pattern "daily/every_x_days/weekly/monthly/yearly"
        number interval
        number[] weekDays "0-6"
        number monthDay "1-31"
        object monthDate "month+day"
    }

    DAILY_RECORD {
        string id PK
        string date "YYYY-MM-DD"
        string taskId "→ Task.id"
        string taskTitle "snapshot"
        string category "snapshot"
        boolean completed
        string completedAt
    }

    FOCUS_SESSION {
        string id PK
        string date "YYYY-MM-DD"
        string taskId "→ Task.id"
        string mode "focus/break"
        number durationPlanned "seconds"
        number durationActual "seconds"
        boolean completed
    }

    TIME_SLOT {
        string id PK
        number duration "minutes"
        string groupKey "→ TaskGroup.key"
        string[] assignedTaskIds
        string[] excludedTaskIds
    }

    PROJECT {
        string id PK
        string title
        string status "active/completed/archived"
        string[] taskIds "→ Task.id[]"
        Record taskStatuses "todo/in_progress/done"
    }
```

---

## 3. Task Lifecycle Flow (วงจรชีวิตของ Task)

```mermaid
flowchart TD
    Start(["ผู้ใช้ต้องการสร้าง Task"]) --> CreateMethod{"วิธีสร้าง"}

    CreateMethod -->|"กดปุ่ม + ใน TaskManager"| OpenModal["เปิด TaskEditModal"]
    CreateMethod -->|"สร้างจาก Project"| ProjectCreate["สร้างผ่าน ProjectManager"]
    CreateMethod -->|"เลือก Default Task"| DefaultPicker["เลือกจากรายการแนะนำ"]
    CreateMethod -->|"AI Import"| AIImport["AIImportModal<br/>(Gemini parse ข้อมูล)"]

    OpenModal --> FillForm["กรอกข้อมูล Task"]
    ProjectCreate --> FillForm
    DefaultPicker --> AddToList["เพิ่มเข้า tasks[]"]
    AIImport --> AddToList

    FillForm --> SetFields["ตั้งค่า:<br/>• title, description<br/>• priority (1-8)<br/>• category (กลุ่มงาน)<br/>• dayTypes (วันที่ทำ)<br/>• subtasks (งานย่อย)<br/>• recurrence (การทำซ้ำ)<br/>• attachments<br/>• estimatedDuration"]

    SetFields --> SaveTask["บันทึก Task"]
    SaveTask --> AddToList

    AddToList --> SaveToFirestore["saveAppData()<br/>→ Firestore"]

    SaveToFirestore --> TaskReady["Task พร้อมใช้งาน"]

    TaskReady --> UsageFlow{"การใช้งาน Task"}

    UsageFlow -->|"แสดงใน Dashboard"| DashboardShow["Dashboard<br/>แสดง tasks วันนี้"]
    UsageFlow -->|"จัดตารางเวลา"| PlannerAssign["DailyPlanner<br/>ผูก task กับ TimeSlot"]
    UsageFlow -->|"จัดการใน Project"| ProjectManage["ProjectManager<br/>จัดสถานะ todo/in_progress/done"]
    UsageFlow -->|"จับเวลา Focus"| FocusUse["FocusTimer<br/>Pomodoro session"]
    UsageFlow -->|"ดูสถิติ"| AnalyticsView["Analytics<br/>วิเคราะห์ productivity"]

    DashboardShow --> Complete{"เสร็จแล้ว?"}
    Complete -->|"เสร็จ (ไม่ recurring)"| MarkDone["completed = true<br/>completedAt = now"]
    Complete -->|"เสร็จ (recurring)"| RecordOnly["บันทึก DailyRecord<br/>(task ยังอยู่ ไม่ mark completed)"]
    Complete -->|"ยังไม่เสร็จ"| TaskReady

    MarkDone --> SaveRecord["addDailyRecordFS()"]
    RecordOnly --> SaveRecord
    SaveRecord --> DailyRecords[("dailyRecords<br/>ใน Firestore")]

    style TaskReady fill:#90EE90
    style DailyRecords fill:#BBDEFB
    style SaveToFirestore fill:#FFE0B2
```

---

## 4. Task Group System (ระบบกลุ่มงาน — Bubble UI)

```mermaid
flowchart TD
    subgraph LifeCategories["🏷️ Life Categories (หมวดหมู่ชีวิต)"]
        Career["💼 career<br/>อาชีพ"]
        Health["💪 health<br/>สุขภาพ"]
        Home["🏠 home<br/>กิจวัตร"]
        Relationship["❤️ relationship<br/>ความสัมพันธ์"]
        Mind["🧠 mind<br/>จิตใจ"]
        Break["⏸️ break<br/>คั่นเวลา"]
        Sleep["🌙 sleep<br/>นอน"]
    end

    subgraph TaskGroups["🔵 Task Groups (กลุ่มงาน)"]
        direction TB
        G1["🔥 งานหลัก<br/>(orange, career)"]
        G2["☕ งานรอง<br/>(yellow, career)"]
        G3["🏠 กิจวัตร<br/>(green, home)"]
        G4["🔧 งานบ้าน<br/>(amber, home)"]
        G5["💪 สุขภาพ<br/>(cyan, health)"]
        G6["🧠 พัฒนาตัวเอง<br/>(violet, mind)"]
        G7["❤️ ครอบครัว<br/>(rose, relationship)"]
        G8["👥 เข้าสังคม<br/>(pink, relationship)"]
        G9["⏸️ พักผ่อน<br/>(green, health)"]
        G10["🙏 สงบใจ<br/>(teal, mind)"]
        G11["📋 ธุระส่วนตัว<br/>(blue, home)"]
        GCustom["➕ กลุ่มเอง<br/>(user-defined)"]
    end

    subgraph BubbleUI["💠 Bubble Display (TaskManager)"]
        direction LR
        B1(("🔥<br/>120px"))
        B2(("☕<br/>100px"))
        B3(("🏠<br/>80px"))
        B4(("🔧<br/>70px"))
    end

    Career --> G1
    Career --> G2
    Home --> G3
    Home --> G4
    Health --> G5
    Mind --> G6
    Relationship --> G7

    G1 -->|"size: 120px"| B1
    G2 -->|"size: 100px"| B2
    G3 -->|"size: 80px"| B3
    G4 -->|"size: 70px"| B4

    subgraph GroupActions["⚙️ Group Actions"]
        Create["สร้างกลุ่มใหม่<br/>(ชื่อ, emoji, สี, icon)"]
        Edit["แก้ไขกลุ่ม"]
        Delete["ลบกลุ่ม<br/>(ถ้าไม่มี task)"]
        Reorder["จัด task ลำดับ<br/>(drag & drop)"]
    end

    BubbleUI -->|"กดเข้ากลุ่ม"| GroupActions

    style Career fill:#FFE0B2
    style Health fill:#B2EBF2
    style Home fill:#C8E6C9
    style Relationship fill:#FFCDD2
    style Mind fill:#E1BEE7
    style Break fill:#F5F5F5
    style Sleep fill:#E8EAF6
```

---

## 5. Task Completion Flow (การ complete task)

```mermaid
flowchart TD
    UserAction(["ผู้ใช้กด complete task"]) --> CheckType{"Task ประเภท?"}

    CheckType -->|"One-time Task<br/>(มี startDate + endDate)"| OneTime["Mark completed = true<br/>completedAt = now"]
    CheckType -->|"Recurring Task<br/>(มี recurrence/dayTypes<br/>หรือไม่มี date)"| Recurring["ไม่แก้ completed<br/>บันทึก DailyRecord แทน"]

    OneTime --> SaveState["setTasks() → update state"]
    Recurring --> CreateRecord["สร้าง DailyRecord"]

    CreateRecord --> RecordData["DailyRecord:<br/>• date: วันนี้<br/>• taskId: task.id<br/>• taskTitle: snapshot<br/>• category: snapshot<br/>• completed: true<br/>• completedAt: ISO"]

    RecordData --> SaveRecord["addDailyRecordFS()<br/>→ Firestore"]

    SaveState --> SaveAppData["saveAppData()<br/>→ Firestore"]

    SaveAppData --> Done(["อัพเดท UI สำเร็จ"])
    SaveRecord --> Done

    Done --> ShowInDashboard["Dashboard แสดง ✅"]
    Done --> TrackAnalytics["Analytics นับสถิติ"]

    style OneTime fill:#C8E6C9
    style Recurring fill:#BBDEFB
    style Done fill:#A5D6A7
```

---

## 6. Schedule Integration Flow (Task × Planner)

```mermaid
flowchart TD
    subgraph Templates["📅 Schedule Templates"]
        Workday["workday<br/>(จ-ศ)"]
        Saturday["saturday<br/>(ส)"]
        Sunday["sunday<br/>(อา)"]
        Custom["Custom Templates<br/>(user-defined)"]
    end

    subgraph Resolution["🔍 Schedule Resolution"]
        direction TB
        R1["1. dateOverrides<br/>(วันที่เจาะจง)"]
        R2["2. datePlans<br/>(แผนวันเจาะจง)"]
        R3["3. dayOverrides<br/>(วันในสัปดาห์ custom)"]
        R4["4. dayPlans<br/>(แผนวันในสัปดาห์)"]
        R5["5. Base template<br/>(workday/sat/sun)"]
        R1 -->|"ไม่มี"| R2
        R2 -->|"ไม่มี"| R3
        R3 -->|"ไม่มี"| R4
        R4 -->|"ไม่มี"| R5
    end

    Templates --> Resolution

    Resolution --> TimeSlots["TimeSlot[]<br/>(ตารางวันนี้)"]

    TimeSlots --> SlotAssign{"แต่ละ slot<br/>มี groupKey"}

    SlotAssign --> AutoMatch["Auto-match Tasks<br/>task.category === slot.groupKey"]
    SlotAssign --> ManualAssign["Manual Assign<br/>slot.assignedTaskIds"]
    SlotAssign --> Exclude["Exclude Tasks<br/>slot.excludedTaskIds"]

    AutoMatch --> DisplaySlot["แสดง Slot ใน Planner"]
    ManualAssign --> DisplaySlot
    Exclude --> DisplaySlot

    DisplaySlot --> SlotInfo["แต่ละ slot แสดง:<br/>• เวลา start-end<br/>• groupKey (กลุ่มงาน)<br/>• tasks ที่ match<br/>• duration"]

    subgraph DurationCalc["⏱️ Duration Calculation (v2)"]
        WakeTime["wakeTime: 05:00"]
        Slot1["Slot 1: duration 60min → 05:00-06:00"]
        Slot2["Slot 2: duration 90min → 06:00-07:30"]
        Slot3["Slot 3: duration 45min → 07:30-08:15"]
        WakeTime --> Slot1 --> Slot2 --> Slot3
    end

    style TimeSlots fill:#FFF9C4
    style DisplaySlot fill:#C8E6C9
```

---

## 7. Priority System (ระบบ Priority 8 ระดับ)

```mermaid
flowchart LR
    subgraph Priorities["🎯 Priority Levels (1-8)"]
        direction TB
        P1["1 ต่ำสุด<br/>🟫 slate-100"]
        P2["2 ต่ำ<br/>🔵 blue-100"]
        P3["3 ปกติ-<br/>🔷 cyan-100"]
        P4["4 ปกติ ⭐ default<br/>🟢 emerald-100"]
        P5["5 ปานกลาง<br/>🟡 yellow-100"]
        P6["6 สูง<br/>🟠 amber-100"]
        P7["7 สำคัญ<br/>🟧 orange-100"]
        P8["8 เร่งด่วน<br/>🔴 rose-100"]
    end

    subgraph Legacy["📦 Legacy Migration"]
        Low["'Low' → 2"]
        Med["'Medium' → 4"]
        High["'High' → 7"]
    end

    Legacy -->|"migrateLegacyPriority()"| Priorities

    subgraph Usage["📊 ใช้ Priority ตรงไหน"]
        TaskCard["Task Card<br/>(แสดงสี + label)"]
        Sorting["เรียงลำดับ Task"]
        Dashboard["Dashboard<br/>(งานสำคัญขึ้นก่อน)"]
        QuickAccess["งานด่วน ⚡ / นัดหมาย 📅"]
    end

    Priorities --> Usage

    style P4 fill:#C8E6C9
    style P8 fill:#FFCDD2
    style P1 fill:#F5F5F5
```

---

## 8. Recurrence System (ระบบทำซ้ำ)

```mermaid
flowchart TD
    RecurrenceCheck(["getTasksForDate(tasks, date)"]) --> HasRecurrence{"task.recurrence<br/>มีไหม?"}

    HasRecurrence -->|"มี (Advanced)"| CheckBounds["เช็ค startDate/endDate bounds"]
    HasRecurrence -->|"ไม่มี (Legacy)"| LegacyCheck["เช็คแบบเก่า"]

    CheckBounds --> PatternMatch{"recurrence.pattern?"}

    PatternMatch -->|"daily"| Daily["แสดงทุกวัน ✅"]
    PatternMatch -->|"every_x_days"| EveryX["นับจาก startDate<br/>ทุก X วัน"]
    PatternMatch -->|"weekly"| Weekly["เช็ค weekDays[]<br/>(0=อา, 1=จ, ... 6=ส)"]
    PatternMatch -->|"monthly"| Monthly["เช็ค monthDay<br/>(วันที่ 1-31)"]
    PatternMatch -->|"yearly"| Yearly["เช็ค month + day"]

    EveryX --> CalcDiff["diffDays = (date - startDate) / 86400000<br/>diffDays % interval === 0 ?"]
    Weekly --> CheckDay["dateObj.getDay() ∈ weekDays ?"]
    Monthly --> CheckDate["dateObj.getDate() === monthDay ?"]
    Yearly --> CheckMonthDay["month+day ตรงกัน ?"]

    LegacyCheck --> LegacyDateRange{"มี startDate + endDate?"}
    LegacyDateRange -->|"มี"| CheckRange["startDate ≤ date ≤ endDate"]
    LegacyDateRange -->|"ไม่มี"| AlwaysActive["ถือว่า recurring<br/>แสดงทุกวัน"]

    CheckRange --> CheckDayType{"มี dayTypes?"}
    AlwaysActive --> CheckDayType

    CheckDayType -->|"มี"| FilterDay["เช็ค dayType ตรงกัน<br/>(workday/saturday/sunday)"]
    CheckDayType -->|"ไม่มี"| ShowAll["แสดงทุกวัน ✅"]

    Daily --> Result(["แสดง/ไม่แสดง Task"])
    CalcDiff --> Result
    CheckDay --> Result
    CheckDate --> Result
    CheckMonthDay --> Result
    FilterDay --> Result
    ShowAll --> Result

    style Daily fill:#C8E6C9
    style AlwaysActive fill:#C8E6C9
    style Result fill:#E1BEE7
```

---

## 9. Data Persistence Flow (การบันทึกข้อมูล)

```mermaid
flowchart LR
    subgraph UserAction["👤 User Action"]
        AddTask["เพิ่ม Task"]
        EditTask["แก้ไข Task"]
        DeleteTask["ลบ Task"]
        CompleteTask["Complete Task"]
        ReorderTask["เรียงลำดับ Task"]
        EditGroup["แก้กลุ่ม"]
    end

    subgraph StateUpdate["⚛️ React State"]
        SetTasks["setTasks()"]
        SetGroups["setTaskGroups()"]
    end

    subgraph SaveLayer["💾 Save to Firestore"]
        ImmediateSave["onImmediateSave()"]
        SaveAppData["saveAppData(uid, data, merge=true)"]
        StripUndefined["stripUndefined()<br/>(Firestore ไม่รับ undefined)"]
        WaitPending["waitForPendingWrites()<br/>(flush old writes)"]
        SetDoc["setDoc(ref, data, merge)"]
    end

    subgraph Firestore["☁️ Firestore"]
        LocalCache["persistentLocalCache<br/>(IndexedDB)"]
        Server["Firestore Server"]
    end

    subgraph Sync["🔄 Real-time Sync"]
        OnSnapshot["onSnapshot listener<br/>(subscribeAppData)"]
        Callback["callback → update state"]
    end

    AddTask --> SetTasks
    EditTask --> SetTasks
    DeleteTask --> SetTasks
    CompleteTask --> SetTasks
    ReorderTask --> SetTasks
    EditGroup --> SetGroups

    SetTasks --> ImmediateSave
    SetGroups --> ImmediateSave

    ImmediateSave --> SaveAppData
    SaveAppData --> StripUndefined
    StripUndefined --> WaitPending
    WaitPending --> SetDoc

    SetDoc -->|"เร็ว (local)"| LocalCache
    LocalCache -->|"async sync"| Server
    Server -->|"onSnapshot echo"| OnSnapshot
    OnSnapshot --> Callback

    style LocalCache fill:#FFF9C4
    style Server fill:#BBDEFB
```

---

## 10. Task × Project Integration (Task กับ Project)

```mermaid
flowchart TD
    subgraph ProjectMgr["📁 ProjectManager"]
        Project["Project<br/>(id, title, taskIds[])"]
        ProcessTimeline["Process Timeline<br/>(AI-generated phases)"]
        TaskStatus["taskStatuses<br/>(per-task: todo/in_progress/done)"]
    end

    subgraph TaskMgr["✅ TaskManager"]
        TaskList["Task List<br/>(ทุก task ใน system)"]
        TaskDetail["Task Detail<br/>(title, priority, category, ...)"]
    end

    Project -->|"taskIds[] reference"| TaskList
    TaskList -->|"แสดง tasks ที่ผูกกับ project"| Project

    subgraph ProjectTaskFlow["🔄 Project Task Flow"]
        CreateInProject["สร้าง Task ใน Project"]
        LinkExisting["ผูก Task ที่มีอยู่"]
        UpdateStatus["อัพเดทสถานะ<br/>todo → in_progress → done"]
        MovePhase["ย้าย Task ระหว่าง Phase<br/>(Kanban drag)"]
    end

    Project --> CreateInProject
    Project --> LinkExisting
    CreateInProject --> TaskList
    LinkExisting --> TaskList

    UpdateStatus -->|"อัพเดท taskStatuses"| TaskStatus
    MovePhase -->|"ย้ายระหว่าง ProjectProcess"| ProcessTimeline

    subgraph StatusFlow["📊 Project Task Status"]
        Todo["📋 todo"]
        InProgress["🔨 in_progress"]
        Done["✅ done"]
        Todo -->|"เริ่มทำ"| InProgress
        InProgress -->|"เสร็จ"| Done
    end

    style Todo fill:#FFF9C4
    style InProgress fill:#BBDEFB
    style Done fill:#C8E6C9
```

---

## 11. Search & Filter Flow (การค้นหา Task)

```mermaid
flowchart TD
    SearchInput(["ผู้ใช้พิมพ์ค้นหา"]) --> SearchView["SearchView Component"]

    SearchView --> TextSearch["Text Search<br/>• title<br/>• description<br/>• notes"]

    TextSearch --> FilterResults{"กรอง results"}

    FilterResults --> ByGroup["กรองตามกลุ่มงาน<br/>(task.category)"]
    FilterResults --> ByPriority["กรองตาม Priority<br/>(1-8)"]
    FilterResults --> ByStatus["กรองตามสถานะ<br/>(completed / not)"]
    FilterResults --> ByDate["กรองตามวันที่<br/>(startDate — endDate)"]

    ByGroup --> Results["แสดงผลลัพธ์"]
    ByPriority --> Results
    ByStatus --> Results
    ByDate --> Results

    Results --> Actions{"action"}
    Actions -->|"กดดู"| ViewTask["เปิด Task Detail"]
    Actions -->|"กด complete"| CompleteTask["Toggle complete"]

    style SearchInput fill:#E3F2FD
    style Results fill:#C8E6C9
```

---

## 12. Quick Access System (งานด่วน & นัดหมาย)

```mermaid
flowchart TD
    subgraph QuickGroups["⚡ Quick-access Groups (ไม่มี category)"]
        Urgent["⚡ งานด่วน<br/>(no schedule slot)"]
        Appointment["📅 นัดหมาย<br/>(no schedule slot)"]
    end

    subgraph Dashboard["📊 Dashboard"]
        GroupPopup["GroupPopup<br/>(แสดง task ของกลุ่ม)"]
        UrgentBadge["Badge: จำนวนงานด่วน"]
        AppointBadge["Badge: จำนวนนัดหมาย"]
    end

    Urgent -->|"กดดู"| GroupPopup
    Appointment -->|"กดดู"| GroupPopup

    GroupPopup --> ShowTasks["แสดง tasks ในกลุ่ม"]
    ShowTasks --> ToggleComplete["กด complete ได้"]
    ShowTasks --> EditTask["กดแก้ไข task ได้"]

    subgraph Difference["📌 ต่างจากกลุ่มปกติ"]
        NoSlot["ไม่ผูกกับ TimeSlot<br/>ใน DailyPlanner"]
        AlwaysShow["แสดงบน Dashboard เสมอ<br/>เป็น popup แยก"]
        NoBubble["ไม่แสดงเป็น bubble<br/>ใน TaskManager"]
    end

    style Urgent fill:#FFF3E0
    style Appointment fill:#E3F2FD
```

---

## 13. Full User Journey (เส้นทางผู้ใช้รายวัน)

```mermaid
flowchart TD
    Morning(["🌅 เช้า — เปิด Debug-me"]) --> Dashboard["📊 Dashboard<br/>ดูตารางวันนี้"]

    Dashboard --> CheckSlot{"Slot ตอนนี้คืออะไร?"}

    CheckSlot -->|"งานหลัก 🔥"| DoWork["ทำงาน + กด Focus Timer"]
    CheckSlot -->|"กิจวัตร 🏠"| DoRoutine["ทำกิจวัตร"]
    CheckSlot -->|"พักผ่อน ⏸️"| TakeBreak["พัก"]

    DoWork --> FocusTimer["⏱️ FocusTimer<br/>(25 min Pomodoro)"]
    FocusTimer --> SessionComplete["Session complete<br/>→ บันทึก FocusSession"]

    DoRoutine --> ToggleTask["กดเสร็จ task<br/>→ บันทึก DailyRecord"]

    SessionComplete --> NextSlot["ไปต่อ slot ถัดไป"]
    ToggleTask --> NextSlot
    TakeBreak --> NextSlot

    NextSlot --> CheckSlot

    subgraph MidDay["🌤️ ระหว่างวัน"]
        UrgentPop["⚡ งานด่วนเข้ามา"]
        UrgentPop --> AddUrgent["เพิ่ม task ในกลุ่มงานด่วน"]
        AddUrgent --> DoUrgent["ทำทันที / จัดลำดับ"]
    end

    subgraph Evening["🌙 เย็น"]
        ReviewDay["ดู Analytics"]
        WriteDiary["เขียน Diary"]
        PlanTomorrow["ปรับตาราง Planner พรุ่งนี้"]
    end

    NextSlot -->|"ถึงสิ้นวัน"| ReviewDay
    ReviewDay --> WriteDiary
    WriteDiary --> PlanTomorrow
    PlanTomorrow --> End(["🌙 จบวัน"])

    style Morning fill:#FFF9C4
    style End fill:#E8EAF6
    style FocusTimer fill:#FFCDD2
    style ToggleTask fill:#C8E6C9
```

---

## Legend (คำอธิบายสัญลักษณ์)

| Symbol | Meaning |
|--------|---------|
| 🟢 Green | สำเร็จ / Complete |
| 🔵 Blue | ข้อมูล / Data |
| 🟡 Yellow | กำลังดำเนินการ / Active |
| 🟠 Orange | บันทึก / Save operation |
| 🔴 Red | สำคัญ / Critical |
| 🟣 Purple | ผลลัพธ์ / Result |
| ⬜ Gray | ค่าเริ่มต้น / Default |

---

*สร้างเมื่อ: 9 เมษายน 2569*
*อ้างอิง: types.ts, App.tsx, TaskManager.tsx, TaskEditModal.tsx, firestoreDB.ts, Dashboard.tsx*
