export const mockTasks = [
  { id:1, name:'Design API endpoints for salary module', source:'TechCorp (Job)', project:'Payroll System', assigned:'Rahul Sharma', date:'2025-06-11', start:'09:00', end:'12:00', priority:'high', status:'in_progress', type:'job' },
  { id:2, name:'Fix login bug on mobile app', source:'FreelanceHub', project:'E-Commerce App', assigned:'Self', date:'2025-06-11', start:'13:00', end:'15:30', priority:'urgent', status:'todo', type:'freelancing' },
  { id:3, name:'Write unit tests for task module', source:'TechCorp (Job)', project:'Task Manager', assigned:'Priya Singh', date:'2025-06-10', start:'10:00', end:'13:00', priority:'normal', status:'completed', type:'job' },
  { id:4, name:'Client call preparation slides', source:'ClientCo', project:'Website Redesign', assigned:'Self', date:'2025-06-12', start:'14:00', end:'15:00', priority:'high', status:'todo', type:'freelancing' },
  { id:5, name:'Update project documentation', source:'Manual', project:'Internal Docs', assigned:'Self', date:'2025-06-09', start:'16:00', end:'17:00', priority:'low', status:'completed', type:'manual' },
  { id:6, name:'Code review for PR #47', source:'TechCorp (Job)', project:'Payroll System', assigned:'Rahul Sharma', date:'2025-06-13', start:'11:00', end:'12:00', priority:'normal', status:'todo', type:'job' },
  { id:7, name:'Database schema migration', source:'TechCorp (Job)', project:'Payroll System', assigned:'Self', date:'2025-06-14', start:'09:00', end:'11:00', priority:'urgent', status:'todo', type:'job' },
  { id:8, name:'Landing page redesign', source:'FreelanceHub', project:'E-Commerce App', assigned:'Aakash Mehta', date:'2025-06-10', start:'14:00', end:'17:00', priority:'normal', status:'in_progress', type:'freelancing' },
];

export const mockMeetings = [
  { id:1, title:'Sprint Planning Q3', source:'TechCorp', project:'Payroll System', date:'2025-06-11', time:'10:00', type:'job', status:'scheduled', members:3, agenda:'Plan sprint tasks and assign story points', mom:'', conclusion:'' },
  { id:2, title:'Client Demo — E-Commerce Phase 2', source:'FreelanceHub', project:'E-Commerce App', date:'2025-06-12', time:'15:00', type:'freelancing', status:'scheduled', members:4, agenda:'Demo new features to client', mom:'', conclusion:'' },
  { id:3, title:'Team Standup', source:'TechCorp', project:'Task Manager', date:'2025-06-10', time:'09:30', type:'job', status:'completed', members:6, agenda:'Daily sync', mom:'Discussed blockers and progress', conclusion:'All tasks on track' },
  { id:4, title:'Design Review Session', source:'ClientCo', project:'Website Redesign', date:'2025-06-09', time:'14:00', type:'freelancing', status:'completed', members:2, agenda:'Review mockups', mom:'Client approved new design direction', conclusion:'Proceed with Phase 2' },
];

export const mockSalary = [
  { id:1, source:'TechCorp (Job)', month:'June 2025', expected:25000, received:25000, pending:0, status:'received', date:'2025-06-05', type:'job', notes:'Full month salary' },
  { id:2, source:'TechCorp (Job)', month:'May 2025', expected:25000, received:20000, pending:5000, status:'partial', date:'2025-05-05', type:'job', notes:'Partial payment received' },
  { id:3, source:'FreelanceHub', month:'June 2025', expected:15000, received:0, pending:15000, status:'pending', date:'—', type:'freelancing', notes:'Invoice sent, awaiting payment' },
  { id:4, source:'ClientCo Project', month:'May 2025', expected:30000, received:30000, pending:0, status:'received', date:'2025-05-20', type:'freelancing', notes:'Website redesign Phase 1' },
];

export const mockLeave = [
  { id:1, company:'TechCorp', date:'2025-06-07', type:'week_off', title:'Saturday', paid:true, deduction:0, status:'approved', reason:'Weekly off' },
  { id:2, company:'TechCorp', date:'2025-06-01', type:'paid_leave', title:'Festival Holiday', paid:true, deduction:0, status:'approved', reason:'National holiday' },
  { id:3, company:'TechCorp', date:'2025-05-25', type:'sick_leave', title:'Sick Day', paid:false, deduction:833, status:'approved', reason:'Fever and cold' },
  { id:4, company:'TechCorp', date:'2025-05-18', type:'half_day', title:'Doctor Appointment', paid:true, deduction:416, status:'approved', reason:'Medical appointment in morning' },
];

export const mockEmails = [
  { id:1, subject:'Leave Request — June 7, 2025', to:'rahul.sharma@techcorp.com', type:'Leave', status:'sent', date:'2025-06-06 14:22', body:'Dear Rahul, I would like to inform you about my leave on June 7, 2025 (Saturday). This is a weekly off.' },
  { id:2, subject:'Project Update — E-Commerce Phase 2', to:'client@freelancehub.com', type:'Work Update', status:'sent', date:'2025-06-05 09:15', body:'Hi Aakash, Here is the update on E-Commerce Phase 2 development progress...' },
  { id:3, subject:'MOM — Sprint Planning Q3', to:'team@techcorp.com', type:'MOM', status:'failed', date:'2025-06-11 11:30', body:'Team, Please find below the minutes of meeting for Sprint Planning Q3...' },
  { id:4, subject:'Salary Follow-up — May Pending', to:'hr@techcorp.com', type:'Salary Follow-up', status:'sent', date:'2025-06-08 10:00', body:'Hi, This is a follow-up regarding the pending salary of ₹5,000 for May 2025.' },
];

export const mockEmployees = [
  { id:1, name:'Rahul Sharma', type:'senior', designation:'Tech Lead', company:'TechCorp', email:'rahul@techcorp.com', phone:'+91 98765 00001' },
  { id:2, name:'Priya Singh', type:'employee', designation:'Developer', company:'TechCorp', email:'priya@techcorp.com', phone:'+91 98765 00002' },
  { id:3, name:'Aakash Mehta', type:'client', designation:'Product Manager', company:'FreelanceHub', email:'aakash@hub.com', phone:'+91 98765 00003' },
  { id:4, name:'Sunita Kapoor', type:'client', designation:'Director', company:'ClientCo', email:'sunita@clientco.com', phone:'+91 98765 00004' },
  { id:5, name:'Dev Patel', type:'employee', designation:'Designer', company:'TechCorp', email:'dev@techcorp.com', phone:'+91 98765 00005' },
];

export const mockJobs = [
  { id:1, company:'TechCorp Solutions', title:'Senior Full Stack Developer', designation:'Senior Developer', salary:25000, joining:'2024-02-10', status:'active', probation_end:'2024-05-10', cycle_start:1, cycle_end:31, received_day:5, reporting:'Rahul Sharma' },
];

export const mockSources = [
  { id:1, name:'FreelanceHub', client:'Aakash Mehta', platform:'Upwork', projects:2, status:'active', email:'aakash@hub.com' },
  { id:2, name:'ClientCo Direct', client:'Sunita Kapoor', platform:'Direct', projects:1, status:'active', email:'sunita@clientco.com' },
];

export const mockProjects = [
  { id:1, name:'Payroll System', source:'TechCorp Solutions', sourceType:'job', status:'active', start:'2024-03-01', budget:0 },
  { id:2, name:'Task Manager', source:'TechCorp Solutions', sourceType:'job', status:'active', start:'2024-06-01', budget:0 },
  { id:3, name:'E-Commerce App', source:'FreelanceHub', sourceType:'freelancing', status:'active', start:'2025-01-15', budget:80000 },
  { id:4, name:'Website Redesign', source:'ClientCo Direct', sourceType:'freelancing', status:'active', start:'2025-04-01', budget:50000 },
];
