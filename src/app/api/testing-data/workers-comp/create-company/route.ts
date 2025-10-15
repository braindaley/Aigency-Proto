import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Import the helper functions from the main route
// We'll extract these into a shared file, but for now we'll duplicate them

interface CompanyData {
  name: string;
  website: string;
  description: string;
  industry: string;
  location: string;
  yearFounded: number;
  employeeCount: number;
}

interface EmployeeData {
  name: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  annualSalary: number;
  description: string;
  classificationCode: number;
  riskAssessment: string;
  safetyMeasures: string;
}

interface LossRun {
  claimNumber: string;
  dateOfLoss: string;
  employeeName: string;
  classCode: string;
  natureOfInjury: string;
  bodyPart: string;
  causeOfInjury: string;
  status: string;
  medicalPaid: number;
  indemnityPaid: number;
  medicalReserve: number;
  indemnityReserve: number;
  totalIncurred: number;
  dateReported: string;
  rtwDate: string;
}

function generateCompanyData(): CompanyData {
  const companies = [
    {
      name: "Precision Manufacturing Solutions LLC",
      website: "www.precisionmanufacturing.com",
      description: "Leading manufacturer of precision metal components for aerospace and automotive industries",
      industry: "Manufacturing",
      location: "Detroit, Michigan"
    },
    {
      name: "Cornerstone Construction Group",
      website: "www.cornerstonebuilds.com",
      description: "Commercial construction company specializing in office buildings and retail spaces",
      industry: "Construction",
      location: "Austin, Texas"
    },
    {
      name: "TechFlow Logistics Inc",
      website: "www.techflowlogistics.com",
      description: "Third-party logistics provider with nationwide warehousing and distribution services",
      industry: "Transportation & Warehousing",
      location: "Atlanta, Georgia"
    }
  ];

  const company = companies[Math.floor(Math.random() * companies.length)];
  return {
    ...company,
    yearFounded: 2015 + Math.floor(Math.random() * 8),
    employeeCount: 50 + Math.floor(Math.random() * 200)
  };
}

function generateEmployeeData(company: CompanyData): EmployeeData[] {
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
  ];

  // Different job templates based on industry
  const manufacturingJobs = [
    { jobTitle: "CEO", department: "Executive", classificationCode: 8810, annualSalary: 180000, riskAssessment: "Low", safetyMeasures: "N/A", description: "Oversees all company operations, sets strategic goals, and manages high-level finances. Primarily works in an office environment." },
    { jobTitle: "Production Manager", department: "Operations", classificationCode: 8810, annualSalary: 95000, riskAssessment: "Medium", safetyMeasures: "Regular safety walks on production floor. Required to wear PPE when in manufacturing areas. Safety training updated annually.", description: "Manages production schedules, oversees manufacturing staff, and ensures quality standards. Spends time both in office and on production floor." },
    { jobTitle: "Machine Operator", department: "Production", classificationCode: 3632, annualSalary: 52000, riskAssessment: "High", safetyMeasures: "All operators are certified on specific machinery. Daily pre-shift equipment inspections required. Safety guards and emergency stops are maintained. Hearing protection and safety glasses required at all times.", description: "Operates CNC machines, lathes, and other manufacturing equipment. Responsible for quality control and basic machine maintenance." },
    { jobTitle: "Quality Inspector", department: "Quality", classificationCode: 8810, annualSalary: 58000, riskAssessment: "Medium", safetyMeasures: "Safety glasses required when inspecting production areas. Ergonomic workstations for inspection tasks.", description: "Inspects manufactured parts for compliance with specifications using precision measuring tools and equipment." },
    { jobTitle: "Maintenance Technician", department: "Facilities", classificationCode: 9014, annualSalary: 62000, riskAssessment: "High", safetyMeasures: "Lock-out/tag-out procedures strictly enforced. Personal protective equipment required for all maintenance tasks. Weekly tool and equipment inspections. Height safety training for ladder work.", description: "Performs preventive and corrective maintenance on manufacturing equipment, electrical systems, and facility infrastructure." },
    { jobTitle: "Warehouse Associate", department: "Operations", classificationCode: 8292, annualSalary: 42000, riskAssessment: "High", safetyMeasures: "Manual lifting training provided. Proper lifting techniques reinforced. Material handling equipment available. Safety vests and steel-toed boots required.", description: "Handles receiving, inventory management, shipping, and general warehouse duties. Operates forklifts and other material handling equipment." },
    { jobTitle: "Administrative Assistant", department: "Administration", classificationCode: 8810, annualSalary: 45000, riskAssessment: "Low", safetyMeasures: "N/A", description: "Provides administrative support including scheduling, correspondence, and office management tasks. Works in standard office environment." }
  ];

  const constructionJobs = [
    { jobTitle: "Owner/CEO", department: "Executive", classificationCode: 5606, annualSalary: 200000, riskAssessment: "Medium", safetyMeasures: "Required to wear PPE when visiting job sites. Safety training updated annually.", description: "Oversees all company operations and makes regular visits to construction sites for project oversight and client meetings." },
    { jobTitle: "Project Manager", department: "Operations", classificationCode: 5474, annualSalary: 85000, riskAssessment: "Medium", safetyMeasures: "PPE required on all job sites. Vehicle safety training for site visits. First aid certification maintained.", description: "Manages construction projects from start to finish, coordinates with subcontractors, and oversees job site activities." },
    { jobTitle: "Site Superintendent", department: "Operations", classificationCode: 5474, annualSalary: 78000, riskAssessment: "High", safetyMeasures: "Comprehensive safety training. Daily safety walks required. PPE mandatory on all sites. OSHA 30 certification maintained.", description: "Supervises daily construction activities, ensures safety compliance, and coordinates work crews on job sites." },
    { jobTitle: "Carpenter", department: "Construction", classificationCode: 5645, annualSalary: 58000, riskAssessment: "High", safetyMeasures: "Safety training on power tools and equipment. Fall protection training for elevated work. Eye and hearing protection required. Tool safety inspections weekly.", description: "Performs framing, finish carpentry, and general construction work using hand and power tools." },
    { jobTitle: "Electrician", department: "Electrical", classificationCode: 5190, annualSalary: 65000, riskAssessment: "High", safetyMeasures: "Electrical safety training and certification required. Lock-out/tag-out procedures mandatory. Arc flash protective equipment used when needed. Regular safety meetings.", description: "Installs and maintains electrical systems in commercial buildings including wiring, panels, and fixtures." },
    { jobTitle: "General Laborer", department: "Construction", classificationCode: 5538, annualSalary: 42000, riskAssessment: "High", safetyMeasures: "Comprehensive safety orientation. PPE required at all times. Manual lifting training. Regular safety meetings and toolbox talks.", description: "Performs various construction tasks including cleanup, material handling, and assisting skilled trades." },
    { jobTitle: "Office Manager", department: "Administration", classificationCode: 8810, annualSalary: 55000, riskAssessment: "Low", safetyMeasures: "N/A", description: "Manages office operations, handles payroll, scheduling, and administrative tasks from main office location." }
  ];

  const logisticsJobs = [
    { jobTitle: "General Manager", department: "Executive", classificationCode: 8810, annualSalary: 120000, riskAssessment: "Low", safetyMeasures: "Safety training for warehouse visits. PPE required in warehouse areas.", description: "Oversees all warehouse and logistics operations, manages staff, and develops operational strategies." },
    { jobTitle: "Warehouse Manager", department: "Operations", classificationCode: 8292, annualSalary: 75000, riskAssessment: "High", safetyMeasures: "Forklift certification and recertification. Daily equipment inspections. Safety vests and steel-toed boots required in warehouse.", description: "Manages daily warehouse operations, supervises staff, and ensures efficient inventory management and shipping processes." },
    { jobTitle: "Forklift Operator", department: "Warehouse", classificationCode: 8292, annualSalary: 48000, riskAssessment: "High", safetyMeasures: "Certified forklift operation with annual recertification. Daily pre-shift equipment inspection. Safety vests, hard hats, and steel-toed boots required.", description: "Operates forklifts and other material handling equipment to move, load, and unload inventory throughout the warehouse." },
    { jobTitle: "Shipping Clerk", department: "Shipping", classificationCode: 8810, annualSalary: 42000, riskAssessment: "Medium", safetyMeasures: "Safety training for package handling. Ergonomic workstations. Safety equipment available for loading dock activities.", description: "Processes shipping documentation, prepares orders for shipment, and coordinates with carriers for pickup and delivery." },
    { jobTitle: "Truck Driver", department: "Transportation", classificationCode: 7219, annualSalary: 55000, riskAssessment: "Medium", safetyMeasures: "CDL required with clean driving record. DOT physical examinations. Vehicle inspection training. Defensive driving course annually.", description: "Operates commercial vehicles for local and regional deliveries, performs pre-trip inspections, and maintains delivery schedules." },
    { jobTitle: "Inventory Specialist", department: "Warehouse", classificationCode: 8810, annualSalary: 45000, riskAssessment: "Medium", safetyMeasures: "Basic warehouse safety training. PPE required in warehouse areas. Ergonomic considerations for computer work.", description: "Manages inventory tracking systems, performs cycle counts, and maintains accurate inventory records using warehouse management systems." },
    { jobTitle: "Customer Service Rep", department: "Customer Service", classificationCode: 8810, annualSalary: 40000, riskAssessment: "Low", safetyMeasures: "N/A", description: "Handles customer inquiries, processes orders, and resolves customer issues via phone and email from office environment." }
  ];

  let jobTemplates: any[] = [];
  if (company.industry === "Manufacturing") jobTemplates = manufacturingJobs;
  else if (company.industry === "Construction") jobTemplates = constructionJobs;
  else jobTemplates = logisticsJobs;

  // Generate individual employees
  const employees: EmployeeData[] = [];
  const targetCount = Math.min(company.employeeCount, 15); // Cap at 15 for readability

  for (let i = 0; i < targetCount; i++) {
    const jobTemplate = jobTemplates[i % jobTemplates.length];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    employees.push({
      name: `${firstName} ${lastName}`,
      jobTitle: jobTemplate.jobTitle,
      department: jobTemplate.department,
      employmentType: Math.random() > 0.9 ? "Part-Time" : "Full-Time",
      annualSalary: jobTemplate.annualSalary + Math.floor((Math.random() - 0.5) * 10000),
      description: jobTemplate.description,
      classificationCode: jobTemplate.classificationCode,
      riskAssessment: jobTemplate.riskAssessment,
      safetyMeasures: jobTemplate.safetyMeasures
    });
  }

  return employees;
}

function generateLossRuns(employees: EmployeeData[]): LossRun[] {
  const firstNames = ['Michael', 'Sarah', 'Robert', 'Carmen', 'James', 'Lisa', 'Pedro', 'Angela', 'David', 'Jennifer'];
  const lastNames = ['Johnson', 'Davis', 'Wilson', 'Martinez', 'Thompson', 'Anderson', 'Garcia', 'Brown', 'Miller', 'Taylor'];

  const natureOfInjuries = ['Strain/Sprain', 'Carpal Tunnel Syndrome', 'Contusion', 'Laceration', 'Burn', 'Fracture', 'Concussion', 'Herniated Disc', 'Tendonitis', 'Bruise'];
  const bodyParts = ['Lower Back', 'Wrist', 'Shoulder', 'Hand', 'Neck', 'Finger', 'Knee', 'Head', 'Leg', 'Arm', 'Ankle', 'Eye'];
  const causesOfInjury = ['Lifting', 'Repetitive Motion', 'Motor Vehicle Accident', 'Struck by Object', 'Contact with Hot Objects', 'Slip and Fall', 'Caught In/Between', 'Fall on Same Level', 'Struck by Falling Object', 'Cut by Sharp Object', 'Overexertion', 'Chemical Exposure'];

  const lossRuns: LossRun[] = [];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const claimsPerYear = [2, 3, 3, 4, 3, 3];

  years.forEach((year, yearIndex) => {
    const numClaims = claimsPerYear[yearIndex];

    for (let i = 0; i < numClaims; i++) {
      const lossDate = new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const reportDate = new Date(lossDate);
      reportDate.setDate(reportDate.getDate() + Math.floor(Math.random() * 3));

      let rtwDate = '';
      const hasRTW = Math.random() > 0.3;
      if (hasRTW) {
        const rtw = new Date(lossDate);
        rtw.setDate(rtw.getDate() + Math.floor(Math.random() * 60) + 7);
        rtwDate = rtw.toISOString().split('T')[0];
      }

      const status = (year >= 2024 && Math.random() > 0.5) ? 'Open' : 'Closed';
      const randomEmp = employees[Math.floor(Math.random() * employees.length)];
      const classCode = randomEmp.classificationCode.toString();

      let medicalPaid = Math.floor(Math.random() * 15000) + 500;
      let indemnityPaid = 0;
      let medicalReserve = 0;
      let indemnityReserve = 0;

      if (Math.random() > 0.6) {
        indemnityPaid = Math.floor(Math.random() * 20000) + 1000;
      }

      if (status === 'Open') {
        medicalReserve = Math.floor(Math.random() * 10000) + 1000;
        if (indemnityPaid > 0 || Math.random() > 0.7) {
          indemnityReserve = Math.floor(Math.random() * 15000) + 2000;
        }
      }

      const totalIncurred = medicalPaid + indemnityPaid + medicalReserve + indemnityReserve;
      const claimNumber = `${year}-${String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')}`;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const employeeName = `${lastName}, ${firstName}`;

      lossRuns.push({
        claimNumber,
        dateOfLoss: lossDate.toISOString().split('T')[0],
        employeeName,
        classCode,
        natureOfInjury: natureOfInjuries[Math.floor(Math.random() * natureOfInjuries.length)],
        bodyPart: bodyParts[Math.floor(Math.random() * bodyParts.length)],
        causeOfInjury: causesOfInjury[Math.floor(Math.random() * causesOfInjury.length)],
        status,
        medicalPaid,
        indemnityPaid,
        medicalReserve,
        indemnityReserve,
        totalIncurred,
        dateReported: reportDate.toISOString().split('T')[0],
        rtwDate
      });
    }
  });

  return lossRuns.sort((a, b) => new Date(b.dateOfLoss).getTime() - new Date(a.dateOfLoss).getTime());
}

// ... (truncated - reuse createEmployeeExcel, createPayrollExcel, createLossRunsExcel, createWordDocument functions from the main route)

// Helper functions from main route (duplicated for now - could be refactored into shared module)
function createEmployeeExcel(company: CompanyData, employees: EmployeeData[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const employeeData = employees.map(emp => ({
    'Employee Name': emp.name,
    'Job Title': emp.jobTitle,
    'Department': emp.department,
    'Full-Time/Part-Time': emp.employmentType,
    'Annual Salary (Est.)': emp.annualSalary,
    'Detailed Job Description': emp.description,
    "Workers' Comp Class Code": emp.classificationCode,
    'Risk Assessment': emp.riskAssessment,
    'Risk Mitigation / Safety Measures': emp.safetyMeasures
  }));
  const worksheet = XLSX.utils.json_to_sheet(employeeData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function createPayrollExcel(company: CompanyData, employees: EmployeeData[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const classificationMap = new Map();
  const classificationData: {[key: number]: {description: string, rate: number}} = {
    8810: { description: 'Clerical Office Employees', rate: 0.35 },
    8292: { description: 'Warehouse Operations', rate: 2.84 },
    9014: { description: 'Maintenance - General', rate: 6.23 },
    3632: { description: 'Machine Shop Operations', rate: 4.82 },
    7219: { description: 'Trucking - Local', rate: 8.89 },
    5474: { description: 'Contractor - Executive Supervisor', rate: 2.88 },
    5645: { description: 'Carpentry - Residential', rate: 8.96 },
    5190: { description: 'Electrical Wiring - Within Buildings', rate: 4.19 },
    5538: { description: 'Construction - General Laborer', rate: 9.27 },
    5606: { description: 'Contractor - Executive Officer', rate: 4.44 }
  };

  employees.forEach(emp => {
    const code = emp.classificationCode;
    if (!classificationMap.has(code)) {
      const classInfo = classificationData[code] || { description: 'Other Operations', rate: 3.50 };
      classificationMap.set(code, {
        classificationCode: code.toString(),
        description: classInfo.description,
        employeeCount: 0,
        totalPayroll: 0,
        rate: classInfo.rate
      });
    }
    const classification = classificationMap.get(code);
    classification.employeeCount++;
    classification.totalPayroll += emp.annualSalary;
  });

  const currentYear = new Date().getFullYear();
  const fein = `${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}`;
  const dataArray = [
    [`${company.name} - Workers Compensation Payroll Report`],
    [`Policy Period: January 1, ${currentYear} - December 31, ${currentYear}`],
    [`FEIN: ${fein}`],
    [''],
    ['Class Code', 'Classification Description', 'Number of Employees', 'Annual Payroll', 'Rate per $100', 'Premium']
  ];

  Array.from(classificationMap.values()).forEach(c => {
    const premium = Math.round((c.totalPayroll / 100) * c.rate * 100) / 100;
    dataArray.push([c.classificationCode, c.description, c.employeeCount, c.totalPayroll, c.rate, premium]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(dataArray);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll by Classification');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function createLossRunsExcel(company: CompanyData, lossRuns: LossRun[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const currentYear = new Date().getFullYear();
  const dataArray = [
    [`${company.name} - Workers Compensation Loss Runs`],
    [`Report Period: January 1, 2019 - December 31, ${currentYear}`],
    [''],
    ['Claim Number', 'Date of Loss', 'Employee Name', 'Class Code', 'Nature of Injury', 'Body Part', 'Cause of Injury', 'Status', 'Medical Paid', 'Indemnity Paid', 'Total Incurred']
  ];

  lossRuns.forEach(loss => {
    dataArray.push([loss.claimNumber, loss.dateOfLoss, loss.employeeName, loss.classCode, loss.natureOfInjury, loss.bodyPart, loss.causeOfInjury, loss.status, loss.medicalPaid, loss.indemnityPaid, loss.totalIncurred]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(dataArray);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loss Runs');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function createWordDocument(title: string, content: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        ...content.split('\n\n').map(p => new Paragraph({ children: [new TextRun({ text: p })] }))
      ]
    }]
  });
  return Packer.toBuffer(doc);
}

export async function POST(req: NextRequest) {
  try {
    console.log('Creating test company with documents...');

    // Generate company data
    const company = generateCompanyData();
    const employees = generateEmployeeData(company);
    const lossRuns = generateLossRuns(employees);

    // Calculate renewal date: 100 days from today
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 100);

    // Create company in Firestore with workers comp renewal
    const companyRef = await addDoc(collection(db, 'companies'), {
      name: company.name,
      description: company.description,
      website: company.website,
      createdAt: new Date().toISOString(),
      isTestData: true,
      renewals: [
        {
          id: Date.now(),
          type: 'workers-comp',
          date: Timestamp.fromDate(renewalDate)
        }
      ]
    });

    console.log(`Test company created with ID: ${companyRef.id}`);

    const storage = getStorage();

    // Generate "create-company-upload" documents and upload to Firebase Storage
    const oshaDoc = await createWordDocument('OSHA Research Data', `OSHA Database Search Results for ${company.name}\n\nCompany OSHA ID: ${Math.floor(Math.random() * 1000000)}\nIndustry Classification: ${company.industry}\n\nSafety Statistics:\n- DART Rate: ${(Math.random() * 3).toFixed(1)}\n- Total Case Rate: ${(Math.random() * 5).toFixed(1)}`);
    const oshaRef = ref(storage, `companies/${companyRef.id}/osha-research-data-create-company-upload.docx`);
    const oshaSnapshot = await uploadBytes(oshaRef, oshaDoc);
    const oshaUrl = await getDownloadURL(oshaSnapshot.ref);

    // Create Firestore document record for OSHA doc
    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'osha-research-data-create-company-upload.docx',
      url: oshaUrl,
      size: oshaDoc.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: new Date(),
      category: 'other'
    });

    const narrativeDoc = await createWordDocument('Operations Narrative', `OPERATIONS NARRATIVE - ${company.name}\n\nBusiness Overview:\n${company.name} is a ${company.industry.toLowerCase()} company established in ${company.yearFounded}. ${company.description}`);
    const narrativeRef = ref(storage, `companies/${companyRef.id}/operations-narrative-create-company-upload.docx`);
    const narrativeSnapshot = await uploadBytes(narrativeRef, narrativeDoc);
    const narrativeUrl = await getDownloadURL(narrativeSnapshot.ref);

    // Create Firestore document record for Operations Narrative
    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'operations-narrative-create-company-upload.docx',
      url: narrativeUrl,
      size: narrativeDoc.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: new Date(),
      category: 'other'
    });

    // Generate ACORD 130 - Workers' Compensation Application
    // Generate realistic experience modification factors for the past 3-5 years
    const currentYear = new Date().getFullYear();
    const experienceMods = [
      { year: currentYear - 5, mod: 0.92 + Math.random() * 0.15 },  // 5 years ago
      { year: currentYear - 4, mod: 0.90 + Math.random() * 0.18 },  // 4 years ago
      { year: currentYear - 3, mod: 0.88 + Math.random() * 0.20 },  // 3 years ago
      { year: currentYear - 2, mod: 0.85 + Math.random() * 0.22 },  // 2 years ago
      { year: currentYear - 1, mod: 0.87 + Math.random() * 0.20 }   // Last year
    ].map(m => ({ ...m, mod: parseFloat(m.mod.toFixed(2)) }));

    const acord130Content = `ACORD 130 - WORKERS' COMPENSATION APPLICATION\n\n` +
      `Applicant Information:\n` +
      `Business Name: ${company.name}\n` +
      `Website: ${company.website}\n` +
      `Description: ${company.description}\n` +
      `Year Founded: ${company.yearFounded}\n` +
      `Number of Employees: ${company.employeeCount}\n\n` +
      `Business Operations:\n` +
      `Industry: ${company.industry}\n` +
      `Location: ${company.location}\n\n` +
      `Classification Information:\n` +
      `See attached payroll by classification document for detailed breakdown of employee classifications, payroll amounts, and premium calculations.\n\n` +
      `Experience Modification:\n` +
      `Current Experience Modification Factor (Effective ${currentYear}): ${experienceMods[4].mod}\n` +
      `Experience Mod State: ${company.location.split(',').pop().trim()}\n\n` +
      `Historical Experience Modification Factors:\n` +
      experienceMods.map(m => `  ${m.year}: ${m.mod}`).join('\n') + '\n\n' +
      `Experience Period Summary (Past 3 Years):\n` +
      `  Year ${currentYear - 3}: Payroll: $${Math.floor(900000 + Math.random() * 400000).toLocaleString()}, Losses: $${Math.floor(20000 + Math.random() * 30000).toLocaleString()}\n` +
      `  Year ${currentYear - 2}: Payroll: $${Math.floor(950000 + Math.random() * 400000).toLocaleString()}, Losses: $${Math.floor(15000 + Math.random() * 35000).toLocaleString()}\n` +
      `  Year ${currentYear - 1}: Payroll: $${Math.floor(1000000 + Math.random() * 400000).toLocaleString()}, Losses: $${Math.floor(25000 + Math.random() * 40000).toLocaleString()}\n\n` +
      `Loss History:\n` +
      `See attached loss runs for 3-5 year claims history including dates, nature of injuries, and amounts paid/reserved.`;
    const acord130Doc = await createWordDocument('ACORD 130 - Workers Compensation Application', acord130Content);
    const acord130Ref = ref(storage, `companies/${companyRef.id}/acord-130-workers-comp-application-create-company-upload.docx`);
    const acord130Snapshot = await uploadBytes(acord130Ref, acord130Doc);
    const acord130Url = await getDownloadURL(acord130Snapshot.ref);

    // Create Firestore document record for ACORD 130
    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'acord-130-workers-comp-application-create-company-upload.docx',
      url: acord130Url,
      size: acord130Doc.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: new Date(),
      category: 'other'
    });

    // Generate ACORD 125 - Commercial Insurance Application
    const acord125Content = `ACORD 125 - COMMERCIAL INSURANCE APPLICATION\n\n` +
      `General Information:\n` +
      `Applicant Name: ${company.name}\n` +
      `DBA: ${company.name}\n` +
      `Physical Address: ${company.location}\n` +
      `Website: ${company.website}\n` +
      `Business Structure: Corporation\n` +
      `Year Founded: ${company.yearFounded}\n\n` +
      `Business Information:\n` +
      `Primary Operations: ${company.description}\n` +
      `Industry: ${company.industry}\n` +
      `Number of Employees: ${company.employeeCount}\n\n` +
      `Coverage Requests:\n` +
      `Workers' Compensation: See ACORD 130 for detailed information\n` +
      `General Liability: Coverage requested\n` +
      `Commercial Auto: Coverage requested\n` +
      `Property: Coverage requested\n\n` +
      `Prior Insurance History:\n` +
      `See attached prior insurance history document for 5-year carrier history.`;
    const acord125Doc = await createWordDocument('ACORD 125 - Commercial Insurance Application', acord125Content);
    const acord125Ref = ref(storage, `companies/${companyRef.id}/acord-125-commercial-insurance-application-create-company-upload.docx`);
    const acord125Snapshot = await uploadBytes(acord125Ref, acord125Doc);
    const acord125Url = await getDownloadURL(acord125Snapshot.ref);

    // Create Firestore document record for ACORD 125
    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'acord-125-commercial-insurance-application-create-company-upload.docx',
      url: acord125Url,
      size: acord125Doc.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: new Date(),
      category: 'other'
    });

    // Generate Coverage Recommendations
    const coverageRecsContent = `COVERAGE RECOMMENDATIONS - ${company.name}\n\n` +
      `Based on our review of ${company.name}'s operations, employee classifications, and loss history, we recommend the following coverage:\n\n` +
      `Workers' Compensation:\n` +
      `- Statutory limits as required by state\n` +
      `- Employer's Liability: $100,000/$100,000/$500,000\n` +
      `- Consider voluntary compensation for any excluded employees\n\n` +
      `General Liability:\n` +
      `- $1,000,000 per occurrence\n` +
      `- $2,000,000 aggregate\n` +
      `- Products/Completed Operations: $2,000,000 aggregate\n\n` +
      `Commercial Auto:\n` +
      `- $1,000,000 combined single limit\n` +
      `- Physical damage coverage with $1,000 deductible\n` +
      `- Hired and non-owned auto coverage\n\n` +
      `Property:\n` +
      `- Coverage based on building and contents values\n` +
      `- Business income coverage recommended\n` +
      `- Equipment breakdown coverage\n\n` +
      `Umbrella/Excess Liability:\n` +
      `- $1,000,000 to $2,000,000 recommended based on operations and exposure\n\n` +
      `Rationale:\n` +
      `These recommendations are based on ${company.industry.toLowerCase()} industry standards, the company's employee count of ${company.employeeCount}, and review of the loss history showing claims patterns that indicate standard risk levels.`;
    const coverageRecsDoc = await createWordDocument('Coverage Recommendations', coverageRecsContent);
    const coverageRecsRef = ref(storage, `companies/${companyRef.id}/coverage-recommendations-create-company-upload.docx`);
    const coverageRecsSnapshot = await uploadBytes(coverageRecsRef, coverageRecsDoc);
    const coverageRecsUrl = await getDownloadURL(coverageRecsSnapshot.ref);

    // Create Firestore document record for Coverage Recommendations
    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'coverage-recommendations-create-company-upload.docx',
      url: coverageRecsUrl,
      size: coverageRecsDoc.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: new Date(),
      category: 'other'
    });

    // ALSO upload the "chat-upload" Excel files to Firebase Storage
    // These files are needed for the first 3 tasks in the workflow
    const employeeExcel = createEmployeeExcel(company, employees);
    const employeeExcelRef = ref(storage, `companies/${companyRef.id}/employee-count-job-descriptions-chat-upload.xlsx`);
    const employeeExcelSnapshot = await uploadBytes(employeeExcelRef, employeeExcel);
    const employeeExcelUrl = await getDownloadURL(employeeExcelSnapshot.ref);

    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'employee-count-job-descriptions-chat-upload.xlsx',
      url: employeeExcelUrl,
      size: employeeExcel.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date(),
      category: 'other'
    });

    const payrollExcel = createPayrollExcel(company, employees);
    const payrollExcelRef = ref(storage, `companies/${companyRef.id}/payroll-by-classification-chat-upload.xlsx`);
    const payrollExcelSnapshot = await uploadBytes(payrollExcelRef, payrollExcel);
    const payrollExcelUrl = await getDownloadURL(payrollExcelSnapshot.ref);

    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'payroll-by-classification-chat-upload.xlsx',
      url: payrollExcelUrl,
      size: payrollExcel.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date(),
      category: 'other'
    });

    const lossRunsExcel = createLossRunsExcel(company, lossRuns);
    const lossRunsExcelRef = ref(storage, `companies/${companyRef.id}/loss-runs-3-5-years-chat-upload.xlsx`);
    const lossRunsExcelSnapshot = await uploadBytes(lossRunsExcelRef, lossRunsExcel);
    const lossRunsExcelUrl = await getDownloadURL(lossRunsExcelSnapshot.ref);

    await addDoc(collection(db, `companies/${companyRef.id}/documents`), {
      name: 'loss-runs-3-5-years-chat-upload.xlsx',
      url: lossRunsExcelUrl,
      size: lossRunsExcel.byteLength,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploadedAt: new Date(),
      category: 'other'
    });

    console.log(`Uploaded ${8} documents (5 create-company + 3 chat-upload) to Firebase Storage and created Firestore records`);

    // Generate "chat-upload" files and return as ZIP for manual download (optional)
    const JSZip = require('jszip');
    const zip = new JSZip();

    zip.file('employee-count-job-descriptions-chat-upload.xlsx', employeeExcel);
    zip.file('payroll-by-classification-chat-upload.xlsx', payrollExcel);
    zip.file('loss-runs-3-5-years-chat-upload.xlsx', lossRunsExcel);

    const priorInsuranceHistory = `PRIOR INSURANCE HISTORY (5 YEARS)\n${company.name}\n\nGENERAL LIABILITY, COMMERCIAL AUTO, AND PROPERTY\n5-year history with carriers, limits, premiums, and claims...`;
    zip.file('prior-insurance-history-chat-upload.txt', priorInsuranceHistory);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=chat-upload-files.zip',
        'X-Company-Id': companyRef.id
      },
    });

  } catch (error) {
    console.error('Error creating test company:', error);
    return NextResponse.json(
      { error: 'Failed to create test company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
