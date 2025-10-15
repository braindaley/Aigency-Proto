import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';

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
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
    'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra',
    'Donald', 'Donna', 'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Kenneth', 'Michelle',
    'Jose', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah', 'Edward', 'Dorothy'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
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
  const firstNames = ['Michael', 'Sarah', 'Robert', 'Carmen', 'James', 'Lisa', 'Pedro', 'Angela', 'David', 'Jennifer', 'Kevin', 'Michelle', 'Mark', 'Jessica', 'Thomas', 'Maria'];
  const lastNames = ['Johnson', 'Davis', 'Wilson', 'Martinez', 'Thompson', 'Anderson', 'Garcia', 'Brown', 'Miller', 'Taylor', 'White', 'Lee', 'Jackson', 'Rodriguez', 'Smith', 'Lopez'];

  const natureOfInjuries = [
    'Strain/Sprain', 'Carpal Tunnel Syndrome', 'Contusion', 'Laceration', 'Burn',
    'Fracture', 'Concussion', 'Herniated Disc', 'Tendonitis', 'Bruise'
  ];

  const bodyParts = [
    'Lower Back', 'Wrist', 'Shoulder', 'Hand', 'Neck', 'Finger', 'Knee', 'Head', 'Leg', 'Arm', 'Ankle', 'Eye'
  ];

  const causesOfInjury = [
    'Lifting', 'Repetitive Motion', 'Motor Vehicle Accident', 'Struck by Object',
    'Contact with Hot Objects', 'Slip and Fall', 'Caught In/Between', 'Fall on Same Level',
    'Struck by Falling Object', 'Cut by Sharp Object', 'Overexertion', 'Chemical Exposure'
  ];

  const carriers = ['State Compensation Insurance Fund', 'Liberty Mutual', 'Travelers', 'The Hartford', 'Zurich'];

  // Generate claims from 2019-2024, with fewer claims in earlier years and some open claims in recent years
  const lossRuns: LossRun[] = [];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const claimsPerYear = [2, 3, 3, 4, 3, 3]; // Total of ~18 claims over 6 years

  years.forEach((year, yearIndex) => {
    const numClaims = claimsPerYear[yearIndex];

    for (let i = 0; i < numClaims; i++) {
      // Generate realistic dates
      const lossDate = new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const reportDate = new Date(lossDate);
      reportDate.setDate(reportDate.getDate() + Math.floor(Math.random() * 3)); // Reported 0-3 days after loss

      // Generate RTW date (if applicable)
      let rtwDate = '';
      const hasRTW = Math.random() > 0.3; // 70% have RTW dates
      if (hasRTW) {
        const rtw = new Date(lossDate);
        rtw.setDate(rtw.getDate() + Math.floor(Math.random() * 60) + 7); // RTW 7-67 days after loss
        rtwDate = rtw.toISOString().split('T')[0];
      }

      // Status logic: recent years may have open claims
      const status = (year >= 2024 && Math.random() > 0.5) ? 'Open' : 'Closed';

      // Get a random employee's classification for realistic class codes
      const randomEmp = employees[Math.floor(Math.random() * employees.length)];
      const classCode = randomEmp.classificationCode.toString();

      // Generate realistic financial data
      let medicalPaid = Math.floor(Math.random() * 15000) + 500;
      let indemnityPaid = 0;
      let medicalReserve = 0;
      let indemnityReserve = 0;

      // More severe injuries have indemnity payments
      if (Math.random() > 0.6) {
        indemnityPaid = Math.floor(Math.random() * 20000) + 1000;
      }

      // Open claims have reserves
      if (status === 'Open') {
        medicalReserve = Math.floor(Math.random() * 10000) + 1000;
        if (indemnityPaid > 0 || Math.random() > 0.7) {
          indemnityReserve = Math.floor(Math.random() * 15000) + 2000;
        }
      }

      const totalIncurred = medicalPaid + indemnityPaid + medicalReserve + indemnityReserve;

      // Generate claim number
      const claimNumber = `${year}-${String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')}`;

      // Generate employee name
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

  // Sort by date of loss (newest first)
  return lossRuns.sort((a, b) => new Date(b.dateOfLoss).getTime() - new Date(a.dateOfLoss).getTime());
}

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

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function createPayrollExcel(company: CompanyData, employees: EmployeeData[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Group employees by classification code
  const classificationMap = new Map();

  // Enhanced classification descriptions and rates
  const classificationData = {
    8810: { description: 'Clerical Office Employees', rate: 0.35 },
    8742: { description: 'Salespersons - Outside', rate: 0.42 },
    8292: { description: 'Warehouse Operations', rate: 2.84 },
    8601: { description: 'Accounting Services', rate: 0.29 },
    8832: { description: 'Information Technology Services', rate: 0.18 },
    9014: { description: 'Maintenance - General', rate: 6.23 },
    9102: { description: 'Maintenance - General', rate: 6.23 },
    3632: { description: 'Machine Shop Operations', rate: 4.82 },
    7380: { description: 'Drivers - Commercial Vehicles', rate: 4.67 },
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

  // Create the data array with header information
  const currentYear = new Date().getFullYear();
  const fein = `${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}`;
  const states = ['California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania'];
  const state = states[Math.floor(Math.random() * states.length)];

  const dataArray = [
    [`${company.name} - Workers Compensation Payroll Report`],
    [`Policy Period: January 1, ${currentYear} - December 31, ${currentYear}`],
    [`FEIN: ${fein}`],
    [`State: ${state}`],
    [''],
    ['Class Code', 'Classification Description', 'Number of Employees', 'Annual Payroll', 'Rate per $100', 'Premium']
  ];

  // Add classification data
  Array.from(classificationMap.values())
    .sort((a, b) => parseInt(a.classificationCode) - parseInt(b.classificationCode))
    .forEach(classification => {
      const premium = Math.round((classification.totalPayroll / 100) * classification.rate * 100) / 100;
      dataArray.push([
        classification.classificationCode,
        classification.description,
        classification.employeeCount,
        classification.totalPayroll,
        classification.rate,
        premium
      ]);
    });

  // Add summary row
  dataArray.push(['']);
  const totalEmployees = Array.from(classificationMap.values()).reduce((sum, c) => sum + c.employeeCount, 0);
  const totalPayroll = Array.from(classificationMap.values()).reduce((sum, c) => sum + c.totalPayroll, 0);
  const totalPremium = Array.from(classificationMap.values()).reduce((sum, c) =>
    sum + Math.round((c.totalPayroll / 100) * c.rate * 100) / 100, 0);

  dataArray.push([
    'TOTALS',
    '',
    totalEmployees,
    totalPayroll,
    '',
    Math.round(totalPremium * 100) / 100
  ]);

  // Create worksheet from array
  const worksheet = XLSX.utils.aoa_to_sheet(dataArray);

  // Set column widths for better formatting
  worksheet['!cols'] = [
    { wch: 12 }, // Class Code
    { wch: 35 }, // Classification Description
    { wch: 18 }, // Number of Employees
    { wch: 15 }, // Annual Payroll
    { wch: 12 }, // Rate per $100
    { wch: 12 }  // Premium
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll by Classification');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function createLossRunsExcel(company: CompanyData, lossRuns: LossRun[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create header information
  const currentYear = new Date().getFullYear();
  const fein = `${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}`;
  const carriers = ['State Compensation Insurance Fund', 'Liberty Mutual', 'Travelers', 'The Hartford', 'Zurich'];
  const carrier = carriers[Math.floor(Math.random() * carriers.length)];
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const dataArray = [
    [`${company.name} - Workers Compensation Loss Runs`],
    [`Report Period: January 1, 2019 - December 31, ${currentYear}`],
    [`FEIN: ${fein}`],
    [`Carrier: ${carrier}`],
    [`Report Date: ${reportDate}`],
    [''],
    [
      'Claim Number', 'Date of Loss', 'Employee Name', 'Class Code',
      'Nature of Injury', 'Body Part', 'Cause of Injury', 'Status',
      'Medical Paid', 'Indemnity Paid', 'Medical Reserve', 'Indemnity Reserve',
      'Total Incurred', 'Date Reported', 'RTW Date'
    ]
  ];

  // Add loss run data
  lossRuns.forEach(loss => {
    dataArray.push([
      loss.claimNumber,
      loss.dateOfLoss,
      loss.employeeName,
      loss.classCode,
      loss.natureOfInjury,
      loss.bodyPart,
      loss.causeOfInjury,
      loss.status,
      loss.medicalPaid,
      loss.indemnityPaid,
      loss.medicalReserve,
      loss.indemnityReserve,
      loss.totalIncurred,
      loss.dateReported,
      loss.rtwDate
    ]);
  });

  // Add summary information
  dataArray.push(['']);
  const totalClaims = lossRuns.length;
  const openClaims = lossRuns.filter(l => l.status === 'Open').length;
  const closedClaims = lossRuns.filter(l => l.status === 'Closed').length;
  const totalMedicalPaid = lossRuns.reduce((sum, l) => sum + l.medicalPaid, 0);
  const totalIndemnityPaid = lossRuns.reduce((sum, l) => sum + l.indemnityPaid, 0);
  const totalMedicalReserve = lossRuns.reduce((sum, l) => sum + l.medicalReserve, 0);
  const totalIndemnityReserve = lossRuns.reduce((sum, l) => sum + l.indemnityReserve, 0);
  const totalIncurred = lossRuns.reduce((sum, l) => sum + l.totalIncurred, 0);

  dataArray.push([
    'SUMMARY',
    `Total Claims: ${totalClaims}`,
    `Open: ${openClaims}`,
    `Closed: ${closedClaims}`,
    '',
    '',
    '',
    '',
    totalMedicalPaid,
    totalIndemnityPaid,
    totalMedicalReserve,
    totalIndemnityReserve,
    totalIncurred,
    '',
    ''
  ]);

  // Create worksheet from array
  const worksheet = XLSX.utils.aoa_to_sheet(dataArray);

  // Set column widths for better formatting
  worksheet['!cols'] = [
    { wch: 15 }, // Claim Number
    { wch: 12 }, // Date of Loss
    { wch: 18 }, // Employee Name
    { wch: 10 }, // Class Code
    { wch: 20 }, // Nature of Injury
    { wch: 12 }, // Body Part
    { wch: 18 }, // Cause of Injury
    { wch: 8 },  // Status
    { wch: 12 }, // Medical Paid
    { wch: 13 }, // Indemnity Paid
    { wch: 13 }, // Medical Reserve
    { wch: 15 }, // Indemnity Reserve
    { wch: 12 }, // Total Incurred
    { wch: 12 }, // Date Reported
    { wch: 12 }  // RTW Date
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loss Runs');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function createWordDocument(title: string, content: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32, // 16pt in half-points
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          ...content.split('\n\n').map(paragraph =>
            new Paragraph({
              children: [new TextRun({ text: paragraph })],
            })
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function POST(req: NextRequest) {
  try {
    const zip = new JSZip();
    const company = generateCompanyData();
    const employees = generateEmployeeData(company);
    const lossRuns = generateLossRuns(employees);

    // Create company info file
    const companyInfo = `Company Name: ${company.name}
Website: ${company.website}
Description: ${company.description}
Industry: ${company.industry}
Location: ${company.location}
Year Founded: ${company.yearFounded}
Employee Count: ${company.employeeCount}`;

    zip.file('company-info.txt', companyInfo);

    // Create Excel files
    const employeeExcel = createEmployeeExcel(company, employees);
    zip.file('employee-count-job-descriptions-chat-upload.xlsx', employeeExcel);

    const payrollExcel = createPayrollExcel(company, employees);
    zip.file('payroll-by-classification-chat-upload.xlsx', payrollExcel);

    const lossRunsExcel = createLossRunsExcel(company, lossRuns);
    zip.file('loss-runs-3-5-years-chat-upload.xlsx', lossRunsExcel);

    // Create Word documents
    const oshaDoc = await createWordDocument(
      'OSHA Research Data',
      `OSHA Database Search Results for ${company.name}

Company OSHA ID: ${Math.floor(Math.random() * 1000000)}
Industry Classification: ${company.industry}
Last Inspection Date: ${new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString()}

Safety Statistics:
- Days Away, Restricted, or Transferred (DART) Rate: ${(Math.random() * 3).toFixed(1)}
- Total Case Rate: ${(Math.random() * 5).toFixed(1)}
- Experience Modification Rate: ${(0.85 + Math.random() * 0.3).toFixed(2)}

Safety Programs:
- Safety Training Program: Implemented
- PPE Program: Active
- Incident Reporting System: Online portal
- Safety Committee: Monthly meetings

Recent Safety Initiatives:
- Ergonomic assessments completed
- New safety equipment installed
- Enhanced training program implemented`
    );
    zip.file('osha-research-data-create-company-upload.docx', oshaDoc);

    const acord130Doc = await createWordDocument(
      'ACORD 130 - Workers Compensation Application',
      `ACORD 130 (2016/03)
WORKERS' COMPENSATION APPLICATION

═══════════════════════════════════════════════════════════════════════════════

AGENCY INFORMATION

Agency Name: ${company.industry === 'Construction' ? 'Premier Construction Insurance Services' :
              company.industry === 'Manufacturing' ? 'Industrial Risk Management Services' :
              'Commercial Insurance Solutions LLC'}
Producer/Agent Name: ${['Michael Johnson, CIC', 'Sarah Davis, CPCU', 'Robert Wilson, CIC', 'Jennifer Martinez, CPCU'][Math.floor(Math.random() * 4)]}
Agency Phone: (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}
Agency Email: ${['info@premierins.com', 'contact@industrialrisk.com', 'service@commercialins.com'][Math.floor(Math.random() * 3)]}
Producer Code: PC${Math.floor(10000 + Math.random() * 89999)}

═══════════════════════════════════════════════════════════════════════════════

APPLICANT INFORMATION

Legal Business Name: ${company.name}
DBA (if different): ${company.name}

Mailing Address:
Street: ${['123 Business Blvd, Suite 100', '456 Commerce St', '789 Industry Ave'][Math.floor(Math.random() * 3)]}
City: ${company.location.split(',')[0]}
State: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'NY'}
ZIP Code: ${Math.floor(10000 + Math.random() * 89999)}

Physical Address: Same as mailing address ☒  Different (specify below) ☐

Primary Contact: ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.name || employees[0].name}
Contact Title: ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.jobTitle || employees[0].jobTitle}
Contact Phone: (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}
Contact Email: info@${company.website.replace('www.', '')}
Website: ${company.website}

Federal Employer ID Number (FEIN): ${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}
Years in Business (Current Ownership): ${new Date().getFullYear() - company.yearFounded}
Years in Business (Total): ${new Date().getFullYear() - company.yearFounded}

SIC Code: ${company.industry === 'Construction' ? '1542' : company.industry === 'Manufacturing' ? '3599' : '4225'}
NAICS Code: ${company.industry === 'Construction' ? '236220' : company.industry === 'Manufacturing' ? '332999' : '493110'}

Business Structure:
☒ Corporation    ☐ LLC    ☐ Partnership    ☐ Sole Proprietor    ☐ Other: __________

State of Incorporation: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'NY'}

═══════════════════════════════════════════════════════════════════════════════

POLICY INFORMATION

Requested Policy Period:
Effective Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
Expiration Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}

Coverage Requested:
Part 1 - Workers Compensation: Statutory Limits
Part 2 - Employers Liability:
  • Each Accident: $1,000,000
  • Disease - Policy Limit: $1,000,000
  • Disease - Each Employee: $1,000,000

Voluntary Compensation: ☐ Yes  ☒ No
USL&H Coverage: ☐ Yes  ☒ No
Foreign Coverage: ☐ Yes  ☒ No

═══════════════════════════════════════════════════════════════════════════════

LOCATIONS

List all business locations where work is performed:

Location #1:
Street Address: ${['123 Business Blvd, Suite 100', '456 Commerce St', '789 Industry Ave'][Math.floor(Math.random() * 3)]}
City, State, ZIP: ${company.location}, ${Math.floor(10000 + Math.random() * 89999)}
County: ${['Erie', 'Travis', 'Fulton', 'Wayne'][Math.floor(Math.random() * 4)]}
Years at Location: ${Math.floor(Math.random() * 10) + 3}
Owned ☐  Rented ☒
Square Footage: ${Math.floor(5000 + Math.random() * 45000).toLocaleString()}

═══════════════════════════════════════════════════════════════════════════════

PARTNERS, OFFICERS, MEMBERS & RELATIVES

List all owners, partners, officers, members who actively engage in the operation of the business:

| Name | Title | Ownership % | State | Duties | Annual Remuneration | Include/Exclude |
|------|-------|-------------|-------|--------|---------------------|-----------------|
${employees.filter(e => e.jobTitle.toLowerCase().includes('ceo') || e.jobTitle.toLowerCase().includes('president') || e.jobTitle.toLowerCase().includes('owner')).slice(0, 3).map(emp =>
`| ${emp.name} | ${emp.jobTitle} | ${emp.jobTitle.toLowerCase().includes('ceo') ? '100.0' : (Math.random() * 30 + 10).toFixed(1)}% | ${company.location.split(',')[1]?.trim().split(' ')[0] || 'NY'} | ${emp.description.substring(0, 50)}... | $${emp.annualSalary.toLocaleString()} | ${emp.jobTitle.toLowerCase().includes('ceo') ? 'Exclude' : 'Include'} |`
).join('\n')}

Officers/Owners Requesting INCLUSION in Coverage:
${employees.filter(e => !e.jobTitle.toLowerCase().includes('ceo')).slice(0, 2).map(e => `• ${e.name} - ${e.jobTitle}`).join('\n')}

Officers/Owners Requesting EXCLUSION from Coverage:
${employees.filter(e => e.jobTitle.toLowerCase().includes('ceo')).slice(0, 1).map(e => `• ${e.name} - ${e.jobTitle}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════

STATE RATING WORKSHEET

State: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'New York'}

Classification Table:

| Loc # | Class Code | Classification Description | # Employees | Est. Annual Remuneration | Rate per $100 | Estimated Premium |
|-------|------------|----------------------------|-------------|--------------------------|---------------|-------------------|
${(() => {
        const classificationMap = new Map();
        const classificationDescriptions = {
          8810: 'Clerical Office Employees NOC',
          8742: 'Salespersons - Outside',
          8292: 'Warehouse Operations',
          8601: 'Accounting Services',
          8832: 'Information Technology Services',
          9014: 'Maintenance - General',
          9102: 'Maintenance - General',
          3632: 'Machine Shop Operations',
          7380: 'Drivers - Commercial Vehicles',
          7219: 'Trucking - Local',
          5474: 'Contractor - Executive Supervisor',
          5645: 'Carpentry - Residential',
          5190: 'Electrical Wiring - Within Buildings',
          5538: 'Construction - General Laborer',
          5606: 'Contractor - Executive Officer',
          5403: 'Carpentry Below $41/Hr',
          5432: 'Carpentry $41/Hr and Above',
          8227: 'Warehouse (Construction or Erection Perm Yard)'
        };

        const rateMap = {
          8810: 0.35, 8742: 0.42, 8292: 2.84, 8601: 0.29, 8832: 0.18,
          9014: 6.23, 9102: 6.23, 3632: 4.82, 7380: 4.67, 7219: 8.89,
          5474: 2.88, 5645: 8.96, 5190: 4.19, 5538: 9.27, 5606: 4.44,
          5403: 8.96, 5432: 8.96, 8227: 2.84
        };

        employees.forEach(emp => {
          const code = emp.classificationCode;
          if (!classificationMap.has(code)) {
            classificationMap.set(code, {
              code,
              description: classificationDescriptions[code] || 'Other Operations',
              count: 0,
              payroll: 0,
              rate: rateMap[code] || 3.50
            });
          }
          const c = classificationMap.get(code);
          c.count++; c.payroll += emp.annualSalary;
        });

        return Array.from(classificationMap.values()).map(c => {
          const premium = Math.floor((c.payroll / 100) * c.rate);
          return `| 1 | ${c.code} | ${c.description} | ${c.count} | $${c.payroll.toLocaleString()} | $${c.rate.toFixed(2)} | $${premium.toLocaleString()} |`;
        }).join('\n');
      })()}

Payroll Summary:
• Total Full-time Employees: ${employees.filter(e => e.employmentType === 'Full-time').length}
• Total Part-time Employees: ${employees.filter(e => e.employmentType === 'Part-time').length}
• Total Seasonal Employees: 0
• Total Estimated Annual Payroll: $${employees.reduce((sum, e) => sum + e.annualSalary, 0).toLocaleString()}

Experience Modification Rate (EMR): 1.00 (Current Year)

═══════════════════════════════════════════════════════════════════════════════

GENERAL INFORMATION QUESTIONS

Please answer YES or NO. If YES, provide detailed explanation in REMARKS section.

1. Is any work performed underground or above 15 feet?
   ${company.industry === 'Construction' ? '☒ YES  ☐ NO' : '☐ YES  ☒ NO'}

2. Do operations involve handling, storage, or use of hazardous materials?
   ${company.industry === 'Manufacturing' ? '☒ YES  ☐ NO' : '☐ YES  ☒ NO'}

3. Is work sublet without requiring certificates of insurance from subcontractors?
   ☐ YES  ☒ NO

4. Is any work performed on barges, vessels, docks, or bridges over water?
   ☐ YES  ☒ NO

5. Are any employees leased or borrowed from other employers?
   ☐ YES  ☒ NO

6. Do any employees work from home?
   ☐ YES  ☒ NO

7. Has any workers comp coverage been declined, canceled, or non-renewed in last 3 years?
   ☐ YES  ☒ NO

8. Are there any undisputed, unpaid workers compensation premiums?
   ☐ YES  ☒ NO

9. Any tax liens or bankruptcy within the last 5 years?
   ☐ YES  ☒ NO

10. Does the business use independent contractors or subcontractors?
    ${company.industry === 'Construction' ? '☒ YES  ☐ NO' : '☐ YES  ☒ NO'}

11. Are certificates of insurance obtained from ALL subcontractors before work begins?
    ${company.industry === 'Construction' ? '☒ YES  ☐ NO' : 'N/A'}

12. Is there a written safety program in place?
    ☒ YES  ☐ NO

13. Is there a return-to-work/modified duty program?
    ☒ YES  ☐ NO

14. Are regular safety meetings conducted?
    ☒ YES  ☐ NO

15. Is personal protective equipment (PPE) provided to all employees who need it?
    ☒ YES  ☐ NO

16. Are pre-employment physicals required after conditional job offers?
    ☐ YES  ☒ NO

17. Do any employees travel outside the United States?
    ☐ YES  ☒ NO

18. Does applicant own, operate, or lease any aircraft or watercraft?
    ☐ YES  ☒ NO

19. Does applicant provide group transportation for employees?
    ☐ YES  ☒ NO

20. Are any employees under age 16 or over age 70?
    ☐ YES  ☒ NO

21. Is volunteer or donated labor used?
    ☐ YES  ☒ NO

22. Does applicant sponsor any athletic teams?
    ☐ YES  ☒ NO

23. Are employee health/medical plans provided?
    ☒ YES  ☐ NO

24. Do employees perform work for other businesses using their own equipment?
    ☐ YES  ☒ NO

═══════════════════════════════════════════════════════════════════════════════

BUSINESS OPERATIONS DESCRIPTION

Primary Business Activities:
${company.description}

Specific Operations Performed:
${company.industry === 'Construction' ? `• Commercial building construction
• Office building development
• Retail space construction
• Project management
• Site supervision
• General contracting services` :
  company.industry === 'Manufacturing' ? `• Precision metal component manufacturing
• CNC machining operations
• Quality control and inspection
• Assembly operations
• Shipping and receiving` :
  `• Warehousing operations
• Distribution services
• Inventory management
• Order fulfillment
• Logistics coordination`}

Products/Services:
${company.industry === 'Construction' ? 'Commercial construction projects including new construction, renovations, and tenant improvements for office and retail spaces.' :
  company.industry === 'Manufacturing' ? 'Precision metal components for aerospace and automotive industries, manufactured to exact specifications.' :
  'Third-party logistics including warehousing, distribution, and fulfillment services.'}

Territory of Operations:
Primary: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'New York'}
${company.industry === 'Construction' ? 'Additional work performed in neighboring states on a project basis.' : 'Operations limited to facility location.'}

═══════════════════════════════════════════════════════════════════════════════

EXPERIENCE MODIFICATION & LOSS HISTORY

Current Experience Modification Rate (EMR): 1.00
Prior Year EMR: 1.00
Two Years Prior EMR: 1.02

═══════════════════════════════════════════════════════════════════════════════

PRIOR CARRIER INFORMATION (Last 5 Years)

${(() => {
  const carriers = ['State Compensation Insurance Fund', 'Liberty Mutual Insurance', 'Travelers Insurance Company', 'The Hartford', 'Zurich American Insurance Company'];
  const currentYear = new Date().getFullYear();
  let priorInfo = '';

  for (let i = 1; i <= 5; i++) {
    const year = currentYear - i;
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    const premium = Math.floor(Math.random() * 500000) + 100000;
    const mod = (0.85 + Math.random() * 0.30).toFixed(2);
    const claims = Math.floor(Math.random() * 8);
    const paidAmount = claims * (Math.floor(Math.random() * 50000) + 10000);
    const reserveAmount = Math.floor(paidAmount * 0.25);

    priorInfo += `Policy Year ${year}-${year + 1}:
Carrier: ${carrier}
Policy Number: WC${year}${Math.floor(100000 + Math.random() * 899999)}
Annual Premium: $${premium.toLocaleString()}
Experience Modification: ${mod}
Number of Claims: ${claims}
Total Incurred: $${(paidAmount + reserveAmount).toLocaleString()}
  - Paid Losses: $${paidAmount.toLocaleString()}
  - Outstanding Reserves: $${reserveAmount.toLocaleString()}
Claims Status: ${claims === 0 ? 'No claims' : `${claims} claims - ${Math.floor(claims * 0.8)} closed, ${Math.ceil(claims * 0.2)} open`}

`;
  }
  return priorInfo;
})()}

═══════════════════════════════════════════════════════════════════════════════

EMPLOYER'S LIABILITY LIMITS

Current Policy Limits:
• Each Accident: $1,000,000
• Disease - Policy Limit: $1,000,000
• Disease - Each Employee: $1,000,000

Waiver of Subrogation Required: ${company.industry === 'Construction' ? '☒ YES  ☐ NO' : '☐ YES  ☒ NO'}
${company.industry === 'Construction' ? 'Blanket waiver requested for all contracts requiring such endorsement.' : ''}

Alternate Employer Endorsement Required: ☐ YES  ☒ NO

═══════════════════════════════════════════════════════════════════════════════

ADDITIONAL COVERAGES/ENDORSEMENTS

☐ Voluntary Compensation Coverage
☐ USL&H Coverage (Longshore & Harbor Workers)
☐ Foreign Voluntary Workers Compensation
☐ Federal Employees (Defense Base Act)
${company.industry === 'Construction' ? '☒ Blanket Waiver of Subrogation' : '☐ Blanket Waiver of Subrogation'}
☐ Alternate Employer Endorsement
☐ Other: _________________________________

═══════════════════════════════════════════════════════════════════════════════

SAFETY & LOSS CONTROL INFORMATION

Written Safety Program: ☒ YES  ☐ NO
Program Last Updated: ${new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Safety Training Programs:
• New Employee Orientation: Comprehensive safety training for all new hires
• Ongoing Safety Training: ${company.industry === 'Construction' ? 'Monthly toolbox talks, annual OSHA 30-hour for supervisors' : 'Quarterly safety meetings, job-specific training'}
• Emergency Response Training: Fire safety, first aid, emergency evacuation procedures
${company.industry === 'Construction' ? '• Fall Protection Training: Annual certification for all workers working at heights' : ''}
${company.industry === 'Manufacturing' ? '• Machine-Specific Training: Required certification for all equipment operators' : ''}

Safety Equipment Provided:
${company.industry === 'Construction' ? `• Hard hats, safety glasses, steel-toed boots
• Fall protection equipment (harnesses, lanyards, lifelines)
• High-visibility vests
• Hearing protection
• Respiratory protection as needed` :
  company.industry === 'Manufacturing' ? `• Safety glasses, hearing protection
• Steel-toed boots, cut-resistant gloves
• Machine guards on all equipment
• First aid stations throughout facility
• Emergency eyewash stations` :
  `• Safety glasses, steel-toed boots
• High-visibility vests
• Back support belts available
• Material handling equipment (forklifts, pallet jacks)
• First aid kits throughout facility`}

Safety Inspections:
• Frequency: ${company.industry === 'Construction' ? 'Daily job site inspections' : 'Weekly facility inspections'}
• Inspector: ${employees.find(e => e.jobTitle.includes('Manager') || e.jobTitle.includes('Supervisor'))?.name || 'Safety Manager'}
• Documentation: All inspections logged and maintained

Incident Investigation Procedure: All incidents investigated within 24 hours with written reports

Return-to-Work Program: Modified duty program available for injured workers

Safety Committee: ${Math.random() > 0.5 ? 'Monthly meetings with employee representatives' : 'Quarterly safety meetings with management and employees'}

Recent Safety Improvements:
• Enhanced training programs implemented ${new Date().getFullYear() - 1}
• New safety equipment purchased ${new Date().getFullYear()}
• Ergonomic assessments completed for high-risk positions
${company.industry === 'Construction' ? '• Fall protection systems upgraded' : ''}
${company.industry === 'Manufacturing' ? '• Machine guarding enhancements completed' : ''}

═══════════════════════════════════════════════════════════════════════════════

REMARKS / ADDITIONAL INFORMATION

${company.industry === 'Construction' ?
  `30 DAYS NOTICE OF CANCELLATION REQUIRED. BLANKET WAIVER OF SUBROGATION to be included.

The business specializes in commercial construction with a focus on office buildings and retail spaces. All projects are managed by experienced supervisors with extensive safety training. Comprehensive subcontractor management program ensures all subs maintain proper insurance coverage.

Field operations follow strict safety protocols with daily safety briefings and regular site inspections. All employees working at heights are trained and certified in fall protection. The company has maintained a strong safety record with proactive loss control measures.` :
  company.industry === 'Manufacturing' ?
  `All manufacturing operations performed in-house at our facility location. Comprehensive quality control program ensures product specifications and safety standards are met. All machine operators are certified and trained on specific equipment.

Regular maintenance schedules followed for all production equipment. Safety guards and emergency stops maintained on all machinery. Ergonomic assessments completed for all workstations to minimize repetitive motion injuries.

Strong emphasis on preventive safety measures with ongoing training and equipment upgrades.` :
  `Operations conducted entirely within our warehouse facility. Material handling equipment regularly inspected and maintained. All forklift operators are certified through an accredited training program.

Comprehensive safety program includes regular training on proper lifting techniques, material handling procedures, and emergency response. Back injury prevention program emphasizes mechanical assists and team lifting for heavy items.

Strong safety culture with employee engagement and regular safety communications.`}

═══════════════════════════════════════════════════════════════════════════════

APPLICANT'S SIGNATURE & FRAUD WARNING

The undersigned authorized representative of the applicant declares that the statements set forth herein are true and that the written statements and materials furnished in conjunction with this application have been reviewed and are accurate and complete to the best of their knowledge and belief. The undersigned is aware that the withholding or misrepresenting of any material fact or circumstances known to the applicant will render this application null and void.

The signing of this application does not bind the applicant or the Company to complete the insurance, but it is agreed that the information contained herein shall be the basis of the contract should a policy be issued, and it will be attached to and become part of the policy if issued.

FRAUD WARNING (Varies by State): Any person who knowingly and with intent to defraud any insurance company or other person files an application for insurance or statement of claim containing any materially false information or conceals for the purpose of misleading, information concerning any fact material thereto commits a fraudulent insurance act, which is a crime and subjects such person to criminal and civil penalties.

Applicant's Signature: _________________________________ Date: ${new Date().toLocaleDateString()}

Print Name: ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.name || employees[0].name}

Title: ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.jobTitle || employees[0].jobTitle}

═══════════════════════════════════════════════════════════════════════════════

FOR AGENT/BROKER USE ONLY

Submission Date: ${new Date().toLocaleDateString()}
Target Premium: $${(() => {
        const rateMap = {
          8810: 0.35, 8742: 0.42, 8292: 2.84, 8601: 0.29, 8832: 0.18,
          9014: 6.23, 9102: 6.23, 3632: 4.82, 7380: 4.67, 7219: 8.89,
          5474: 2.88, 5645: 8.96, 5190: 4.19, 5538: 9.27, 5606: 4.44,
          5403: 8.96, 5432: 8.96, 8227: 2.84
        };
        return Math.floor(employees.reduce((sum, emp) => {
          const rate = rateMap[emp.classificationCode] || 3.50;
          return sum + (emp.annualSalary / 100 * rate);
        }, 0)).toLocaleString();
      })()}
Account Notes: New business submission - ${company.industry} industry

═══════════════════════════════════════════════════════════════════════════════

END OF ACORD 130 APPLICATION

This is a specimen form for demonstration purposes. Actual ACORD 130 forms may vary by state and carrier.`
    );
    zip.file('acord-130-workers-comp-application-create-company-upload.docx', acord130Doc);

    const acord125Doc = await createWordDocument(
      'ACORD 125 - Commercial Insurance Application',
      `ACORD 125 (2016/03)
COMMERCIAL INSURANCE APPLICATION

═══════════════════════════════════════════════════════════════════════════════

AGENCY INFORMATION

Agency Name: ${company.industry === 'Construction' ? 'Premier Construction Insurance Services' :
              company.industry === 'Manufacturing' ? 'Industrial Risk Management Services' :
              'Commercial Insurance Solutions LLC'}
National Producer Number: NPN${Math.floor(100000 + Math.random() * 899999)}
Agency Contact: ${['Michael Johnson, CIC', 'Sarah Davis, CPCU', 'Robert Wilson, CIC', 'Jennifer Martinez, CPCU'][Math.floor(Math.random() * 4)]}
Agency Phone: (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}
Agency Email: ${['info@premierins.com', 'contact@industrialrisk.com', 'service@commercialins.com'][Math.floor(Math.random() * 3)]}
Producer Code: PC${Math.floor(10000 + Math.random() * 89999)}

═══════════════════════════════════════════════════════════════════════════════

LINES OF BUSINESS

Coverage Requested (Check all that apply):
☒ Commercial General Liability
☒ Property
☐ Crime
☒ Business Auto
☒ Umbrella/Excess Liability
☒ Workers Compensation
☐ Other: __________

═══════════════════════════════════════════════════════════════════════════════

POLICY INFORMATION

Proposed Effective Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
Proposed Expiration Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
Policy Term: 12 Months (Annual)

Billing Information:
Who Will Be Billed: Applicant
Payment Plan: Annual / Semi-Annual / Quarterly / Monthly (Select)
Prior Policy Number (if renewal): N/A - New Business

═══════════════════════════════════════════════════════════════════════════════

APPLICANT INFORMATION

Legal Business Name: ${company.name}
DBA/Trade Name(s): ${company.name}

Mailing Address:
Street: ${['123 Business Blvd, Suite 100', '456 Commerce St', '789 Industry Ave'][Math.floor(Math.random() * 3)]}
City: ${company.location.split(',')[0]}
State: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'NY'}
ZIP Code: ${Math.floor(10000 + Math.random() * 89999)}

Physical Address: ☒ Same as mailing  ☐ Different (see below)

Business Contact Information:
Primary Phone: (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}
Business Email: info@${company.website.replace('www.', '')}
Website: ${company.website}

Federal ID Number (FEIN): ${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}
Years in Business: ${new Date().getFullYear() - company.yearFounded}

Business Structure:
☒ Corporation  ☐ LLC  ☐ Partnership  ☐ Sole Proprietorship  ☐ Other
State of Incorporation: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'NY'}

═══════════════════════════════════════════════════════════════════════════════

CONTACT INFORMATION

| Contact Type | Name | Title | Phone | Email |
|--------------|------|-------|-------|-------|
| Primary Contact | ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.name || employees[0].name} | ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.jobTitle || employees[0].jobTitle} | (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000} | info@${company.website.replace('www.', '')} |
| Billing Contact | ${employees.find(e => e.jobTitle.includes('Manager') || e.jobTitle.includes('Director'))?.name || employees[1]?.name} | ${employees.find(e => e.jobTitle.includes('Manager') || e.jobTitle.includes('Director'))?.jobTitle || 'Office Manager'} | (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000} | billing@${company.website.replace('www.', '')} |
| Claims Contact | ${employees.find(e => e.jobTitle.includes('Manager') || e.jobTitle.includes('Director'))?.name || employees[1]?.name} | ${employees.find(e => e.jobTitle.includes('Manager') || e.jobTitle.includes('Director'))?.jobTitle || 'Operations Manager'} | (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000} | claims@${company.website.replace('www.', '')} |

═══════════════════════════════════════════════════════════════════════════════

PREMISES INFORMATION

Location 1 (Primary):
Location Number: 1
Street Address: ${['123 Business Blvd, Suite 100', '456 Commerce St', '789 Industry Ave'][Math.floor(Math.random() * 3)]}
City, State, ZIP: ${company.location}, ${Math.floor(10000 + Math.random() * 89999)}
County: ${['Erie', 'Travis', 'Fulton', 'Wayne'][Math.floor(Math.random() * 4)]}
Inside/Outside City Limits: Inside
Owned or Leased: ${Math.random() > 0.5 ? 'Leased' : 'Owned'}
Number of Employees at Location: ${employees.length}
Annual Revenues at Location: $${employees.reduce((sum, e) => sum + e.annualSalary, 0).toLocaleString()}
Total Building Square Footage: ${Math.floor(10000 + Math.random() * 40000).toLocaleString()}
Square Footage Occupied: ${Math.floor(8000 + Math.random() * 32000).toLocaleString()}
Square Footage Open to Public: ${company.industry === 'Construction' || company.industry === 'Manufacturing' ? '0' : Math.floor(500 + Math.random() * 2000).toLocaleString()}
Any Part Leased to Others: No

Building Details (Location 1):
Year Built: ${Math.floor(1980 + Math.random() * 40)}
Number of Stories: ${Math.floor(1 + Math.random() * 3)}
Construction Type: ${['Masonry Non-Combustible', 'Frame', 'Fire Resistive', 'Modified Fire Resistive'][Math.floor(Math.random() * 4)]}
Roof Type: ${['Flat Built-up', 'Metal', 'Composition Shingle'][Math.floor(Math.random() * 3)]}
Roof Age: ${Math.floor(5 + Math.random() * 15)} years
Fire Protection:
  - Sprinkler System: ${Math.random() > 0.5 ? 'Full' : 'Partial'}
  - Fire Alarm: Yes - Central Station
  - Burglar Alarm: Yes
  - Distance to Fire Hydrant: ${Math.floor(100 + Math.random() * 900)} feet
  - Distance to Fire Station: ${(Math.random() * 5 + 0.5).toFixed(1)} miles

═══════════════════════════════════════════════════════════════════════════════

NATURE OF BUSINESS

Business Operations Description:
${company.description}

Primary Business Activities:
${company.industry === 'Construction' ? `• Commercial building construction and development
• Office building construction
• Retail space construction and tenant improvements
• Project management and general contracting
• Site supervision and safety management` :
  company.industry === 'Manufacturing' ? `• Precision metal component manufacturing
• CNC machining and fabrication
• Quality control and inspection
• Assembly and finishing operations
• Shipping and logistics` :
  `• Third-party logistics and warehousing
• Distribution and fulfillment services
• Inventory management
• Order processing and shipping
• Transportation coordination`}

Products or Services Provided:
${company.industry === 'Construction' ? 'Commercial construction services including new construction, renovations, and tenant improvements for office buildings and retail spaces.' :
  company.industry === 'Manufacturing' ? 'Precision-machined metal components for aerospace and automotive industries, manufactured to exact specifications with comprehensive quality control.' :
  'Complete third-party logistics solutions including warehousing, distribution, order fulfillment, and transportation services.'}

Date Business Started: ${String(company.yearFounded).padStart(2, '0')}/01/${company.yearFounded}

Business Classification:
SIC Code: ${company.industry === 'Construction' ? '1542' : company.industry === 'Manufacturing' ? '3599' : '4225'}
NAICS Code: ${company.industry === 'Construction' ? '236220' : company.industry === 'Manufacturing' ? '332999' : '493110'}
Industry Description: ${company.industry === 'Construction' ? 'Commercial and Institutional Building Construction' :
                       company.industry === 'Manufacturing' ? 'All Other Miscellaneous Fabricated Metal Product Manufacturing' :
                       'General Warehousing and Storage'}

Gross Annual Revenue:
Current Year Estimate: $${Math.floor(employees.reduce((sum, e) => sum + e.annualSalary, 0) * 2.5).toLocaleString()}
Prior Year Actual: $${Math.floor(employees.reduce((sum, e) => sum + e.annualSalary, 0) * 2.3).toLocaleString()}
2 Years Ago: $${Math.floor(employees.reduce((sum, e) => sum + e.annualSalary, 0) * 2.1).toLocaleString()}

Number of Employees:
Full-Time: ${employees.filter(e => e.employmentType === 'Full-time').length}
Part-Time: ${employees.filter(e => e.employmentType === 'Part-time').length}
Seasonal: 0
Total: ${employees.length}

Annual Payroll: $${employees.reduce((sum, e) => sum + e.annualSalary, 0).toLocaleString()}

═══════════════════════════════════════════════════════════════════════════════

ADDITIONAL INTERESTS

| Interest Type | Name & Address | Loan/Lease Number | Location Applicable |
|---------------|----------------|-------------------|---------------------|
| ${Math.random() > 0.5 ? 'Mortgagee' : 'Lessor'} | ${['First National Bank', 'City Commercial Lending', 'Regional Business Bank'][Math.floor(Math.random() * 3)]}, ${company.location} | ${Math.random() > 0.5 ? 'LOAN-' + Math.floor(100000 + Math.random() * 899999) : 'LEASE-' + Math.floor(100000 + Math.random() * 899999)} | Location 1 |

═══════════════════════════════════════════════════════════════════════════════

GENERAL INFORMATION QUESTIONS

Please answer YES or NO. If YES, provide explanation in Remarks section.

1. Has the applicant or any predecessor ever had insurance canceled or non-renewed?
   ☐ YES  ☒ NO

2. Does applicant have any business owned or operated under a different name?
   ☐ YES  ☒ NO

3. Does applicant lease, rent or loan equipment to others?
   ☐ YES  ☒ NO

4. Any work subcontracted?
   ${company.industry === 'Construction' ? '☒ YES  ☐ NO' : '☐ YES  ☒ NO'}

5. Are certificates of insurance obtained from all subcontractors?
   ${company.industry === 'Construction' ? '☒ YES  ☐ NO (See Remarks)' : 'N/A'}

6. Any operations on customer premises?
   ${company.industry === 'Construction' ? '☒ YES  ☐ NO' : company.industry === 'Manufacturing' ? '☐ YES  ☒ NO' : '☒ YES  ☐ NO'}

7. Any products sold or distributed under another name?
   ☐ YES  ☒ NO

8. Any products recalled in last 5 years?
   ☐ YES  ☒ NO

9. Any business conducted outside the United States?
   ☐ YES  ☒ NO

10. Does applicant have an employee safety program?
    ☒ YES  ☐ NO

11. Does applicant have a return-to-work/modified duty program?
    ☒ YES  ☐ NO

12. Any hazardous materials handled, stored, or disposed of?
    ${company.industry === 'Manufacturing' ? '☒ YES  ☐ NO (See Remarks)' : '☐ YES  ☒ NO'}

13. Any swimming pools, elevators, or escalators on premises?
    ${Math.floor(1 + Math.random() * 3) > 1 ? '☒ YES  ☐ NO (Elevator)' : '☐ YES  ☒ NO'}

14. Any underground storage tanks?
    ☐ YES  ☒ NO

15. Any environmental violations in last 5 years?
    ☐ YES  ☒ NO

═══════════════════════════════════════════════════════════════════════════════

PRIOR INSURANCE HISTORY (Last 5 Years)

${(() => {
  const carriers = [
    { name: 'The Hartford', gl: true, property: true, auto: true, wc: true },
    { name: 'Liberty Mutual', gl: true, property: true, auto: true, wc: true },
    { name: 'Travelers', gl: true, property: true, auto: true, wc: true },
    { name: 'Zurich', gl: true, property: false, auto: true, wc: true },
    { name: 'CNA', gl: true, property: true, auto: false, wc: false }
  ];
  const currentYear = new Date().getFullYear();
  let priorInfo = '| Year | General Liability | Property | Auto | Workers Comp |\n';
  priorInfo += '|------|-------------------|----------|------|---------------|\n';

  for (let i = 1; i <= 5; i++) {
    const year = currentYear - i;
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    priorInfo += `| ${year}-${year + 1} | ${carrier.gl ? carrier.name : 'N/A'} | ${carrier.property ? carrier.name : 'N/A'} | ${carrier.auto ? carrier.name : 'N/A'} | ${carrier.wc ? carrier.name : 'N/A'} |\n`;
  }

  return priorInfo;
})()}

Cancellations/Non-Renewals in Last 5 Years: None

═══════════════════════════════════════════════════════════════════════════════

LOSS HISTORY (Last 5 Years)

Summary of All Claims (GL, Property, Auto, WC):

${(() => {
  const currentYear = new Date().getFullYear();
  let lossInfo = '| Year | Coverage Type | # Claims | Total Incurred | Status |\n';
  lossInfo += '|------|---------------|----------|----------------|--------|\n';

  for (let i = 1; i <= 5; i++) {
    const year = currentYear - i;
    const wcClaims = Math.floor(Math.random() * 5);
    const glClaims = Math.floor(Math.random() * 3);
    const autoClaims = Math.floor(Math.random() * 2);
    const propClaims = Math.random() > 0.8 ? 1 : 0;

    if (wcClaims > 0) {
      const wcIncurred = wcClaims * (Math.floor(Math.random() * 40000) + 10000);
      lossInfo += `| ${year} | Workers Comp | ${wcClaims} | $${wcIncurred.toLocaleString()} | ${Math.random() > 0.7 ? '1 Open, ' + (wcClaims - 1) + ' Closed' : 'All Closed'} |\n`;
    }
    if (glClaims > 0) {
      const glIncurred = glClaims * (Math.floor(Math.random() * 30000) + 5000);
      lossInfo += `| ${year} | General Liability | ${glClaims} | $${glIncurred.toLocaleString()} | All Closed |\n`;
    }
    if (autoClaims > 0) {
      const autoIncurred = autoClaims * (Math.floor(Math.random() * 25000) + 8000);
      lossInfo += `| ${year} | Auto | ${autoClaims} | $${autoIncurred.toLocaleString()} | All Closed |\n`;
    }
    if (propClaims > 0) {
      const propIncurred = Math.floor(Math.random() * 50000) + 10000;
      lossInfo += `| ${year} | Property | ${propClaims} | $${propIncurred.toLocaleString()} | Closed |\n`;
    }
  }

  const totalClaims = Math.floor(Math.random() * 15) + 10;
  const totalIncurred = Math.floor(Math.random() * 400000) + 150000;
  lossInfo += `\nTotal Claims Last 5 Years: ${totalClaims}\n`;
  lossInfo += `Total Incurred Amount: $${totalIncurred.toLocaleString()}`;

  return lossInfo;
})()}

═══════════════════════════════════════════════════════════════════════════════

GENERAL LIABILITY COVERAGE

Requested Limits:
General Aggregate: $2,000,000
Products/Completed Operations Aggregate: $2,000,000
Personal & Advertising Injury: $1,000,000
Each Occurrence: $1,000,000
Fire Damage (Any one fire): $50,000
Medical Expense (Any one person): $5,000

Deductible: $1,000

Estimated Gross Annual Sales/Receipts: $${Math.floor(employees.reduce((sum, e) => sum + e.annualSalary, 0) * 2.5).toLocaleString()}

═══════════════════════════════════════════════════════════════════════════════

PROPERTY COVERAGE

Coverage Type: ☒ Building  ☒ Business Personal Property  ☒ Business Income

Building Coverage:
Limit of Insurance: $${Math.floor(500000 + Math.random() * 1500000).toLocaleString()}
Valuation: ☒ Replacement Cost  ☐ Actual Cash Value

Business Personal Property:
Limit of Insurance: $${Math.floor(100000 + Math.random() * 400000).toLocaleString()}
Valuation: ☒ Replacement Cost  ☐ Actual Cash Value

Business Income Coverage:
Limit of Insurance: $${Math.floor(250000 + Math.random() * 750000).toLocaleString()}
Maximum Period of Indemnity: 12 months

Deductible: $${[2500, 5000, 10000][Math.floor(Math.random() * 3)].toLocaleString()}

Additional Coverages Requested:
☒ Equipment Breakdown
☒ Ordinance or Law (25%)
☐ Flood
☐ Earthquake

═══════════════════════════════════════════════════════════════════════════════

COMMERCIAL AUTO COVERAGE

Number of Vehicles: ${Math.floor(3 + Math.random() * 8)}

Vehicle Types:
${company.industry === 'Construction' ? `• Pick-up Trucks (${Math.floor(2 + Math.random() * 4)})
• Cargo Vans (${Math.floor(1 + Math.random() * 3)})
• Light Duty Trucks (${Math.floor(0 + Math.random() * 2)})` :
  company.industry === 'Manufacturing' ? `• Sedans (${Math.floor(1 + Math.random() * 2)})
• Cargo Vans (${Math.floor(1 + Math.random() * 2)})
• Light Duty Trucks (${Math.floor(1 + Math.random() * 3)})` :
  `• Cargo Vans (${Math.floor(2 + Math.random() * 4)})
• Box Trucks (${Math.floor(1 + Math.random() * 3)})
• Sedans (${Math.floor(0 + Math.random() * 2)})`}

Liability Limits:
Combined Single Limit: $1,000,000

Physical Damage:
Comprehensive Deductible: $500
Collision Deductible: $1,000

Coverages Requested:
☒ Hired Auto
☒ Non-Owned Auto
☒ Uninsured/Underinsured Motorist

Driver Information:
Total number of drivers: ${employees.length}
Youngest driver age: ${Math.floor(22 + Math.random() * 8)}
All drivers have valid licenses: Yes

═══════════════════════════════════════════════════════════════════════════════

UMBRELLA/EXCESS LIABILITY COVERAGE

Requested Umbrella Limit: $5,000,000

Underlying Policies:
General Liability: $1,000,000
Auto Liability: $1,000,000
Employers Liability: $1,000,000

Self-Insured Retention (SIR): $10,000

═══════════════════════════════════════════════════════════════════════════════

WORKERS COMPENSATION COVERAGE

States Where Coverage Applies: ${company.location.split(',')[1]?.trim().split(' ')[0] || 'NY'}

Estimated Annual Payroll by Classification:

${(() => {
  const classificationMap = new Map();
  const classificationDescriptions = {
    8810: 'Clerical Office Employees NOC',
    8742: 'Salespersons - Outside',
    8292: 'Warehouse Operations',
    8601: 'Accounting Services',
    8832: 'Information Technology Services',
    9014: 'Maintenance - General',
    3632: 'Machine Shop Operations',
    7380: 'Drivers - Commercial Vehicles',
    7219: 'Trucking - Local',
    5474: 'Contractor - Executive Supervisor',
    5645: 'Carpentry - Residential',
    5190: 'Electrical Wiring - Within Buildings',
    5538: 'Construction - General Laborer',
    5606: 'Contractor - Executive Officer',
    5403: 'Carpentry Below $41/Hr',
    8227: 'Warehouse (Construction Perm Yard)'
  };

  employees.forEach(emp => {
    const code = emp.classificationCode;
    if (!classificationMap.has(code)) {
      classificationMap.set(code, {
        code,
        description: classificationDescriptions[code] || 'Other Operations',
        count: 0,
        payroll: 0
      });
    }
    const c = classificationMap.get(code);
    c.count++; c.payroll += emp.annualSalary;
  });

  let table = '| Class Code | Description | # Employees | Annual Payroll |\n';
  table += '|------------|-------------|-------------|----------------|\n';

  Array.from(classificationMap.values()).forEach(c => {
    table += `| ${c.code} | ${c.description} | ${c.count} | $${c.payroll.toLocaleString()} |\n`;
  });

  return table;
})()}

Total Estimated Annual Payroll: $${employees.reduce((sum, e) => sum + e.annualSalary, 0).toLocaleString()}

Employers Liability Limits:
Each Accident: $1,000,000
Disease - Policy Limit: $1,000,000
Disease - Each Employee: $1,000,000

Experience Modification Rate (EMR): 1.00

Waiver of Subrogation Required: ${company.industry === 'Construction' ? 'Yes - Blanket waiver for all contracts' : 'No'}

═══════════════════════════════════════════════════════════════════════════════

REMARKS / ADDITIONAL INFORMATION

${company.industry === 'Construction' ?
  `CONSTRUCTION OPERATIONS:
This business specializes in commercial construction with a primary focus on office buildings and retail spaces. All construction projects are managed by experienced supervisors with comprehensive safety training and OSHA certification.

SUBCONTRACTOR MANAGEMENT:
The company utilizes subcontractors for specialized trades. Certificates of insurance are required from all subcontractors prior to commencement of work, and all certificates are verified to meet the company's insurance requirements including general liability and workers compensation coverage.

SAFETY PROGRAM:
Comprehensive written safety program in place with daily toolbox talks, weekly safety meetings, and regular site inspections. All employees working at heights receive fall protection training and certification. PPE is mandatory for all personnel on job sites.

SPECIAL REQUIREMENTS:
• 30 Days Notice of Cancellation Required
• Blanket Waiver of Subrogation to be included for all contracts requiring such endorsement
• Primary & Non-Contributory language where required by contract` :
  company.industry === 'Manufacturing' ?
  `MANUFACTURING OPERATIONS:
All manufacturing operations are performed in-house at the facility location listed above. The company specializes in precision metal component manufacturing for aerospace and automotive industries with strict quality control standards.

EQUIPMENT & MACHINERY:
Modern CNC machining equipment with comprehensive maintenance schedules. All machine operators are certified and trained on specific equipment. Safety guards and emergency stops are maintained on all machinery.

HAZARDOUS MATERIALS:
Limited quantities of cutting fluids, lubricants, and metal working fluids are stored on premises. All materials are stored in accordance with OSHA and EPA regulations. Proper ventilation and safety equipment are in place.

SAFETY PROGRAM:
Written safety program includes machine-specific training, lockout/tagout procedures, PPE requirements, and emergency response procedures. Regular safety inspections and ergonomic assessments are conducted.` :
  `WAREHOUSING & LOGISTICS OPERATIONS:
All operations are conducted within the warehouse facility listed above. Services include inventory management, order fulfillment, and distribution for various commercial clients.

MATERIAL HANDLING:
All forklift operators are certified through an accredited training program. Regular equipment inspections and maintenance schedules are followed. Proper loading dock procedures and traffic management systems are in place.

SAFETY PROGRAM:
Comprehensive safety program emphasizing proper lifting techniques, material handling procedures, and slip/trip/fall prevention. Back injury prevention program includes mechanical assists and team lifting requirements for heavy items.

OPERATIONS:
Standard warehousing operations with no temperature-controlled storage, no hazardous materials, and no high-value merchandise requiring special security measures.`}

The applicant maintains comprehensive insurance records and has a history of stable insurance relationships with no cancellations or non-renewals.

═══════════════════════════════════════════════════════════════════════════════

APPLICANT'S SIGNATURE & FRAUD WARNING

The undersigned authorized representative of the applicant declares that the statements in this application and any attachments are true and complete to the best of their knowledge and belief. The undersigned acknowledges that the insurer will rely upon the information contained herein and that this information forms the basis of any policy issued.

The signing of this application does not bind the applicant or insurer to complete the insurance, but it is agreed that this application shall be the basis of the contract should a policy be issued and it will be attached to and become part of the policy.

FRAUD WARNING: Any person who knowingly and with intent to defraud any insurance company or other person files an application for insurance or statement of claim containing any materially false information or conceals for the purpose of misleading, information concerning any fact material thereto commits a fraudulent insurance act, which is a crime and subjects such person to criminal and civil penalties.

Applicant's Signature: _________________________________

Print Name: ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.name || employees[0].name}
Title: ${employees.find(e => e.jobTitle.includes('CEO') || e.jobTitle.includes('President'))?.jobTitle || employees[0].jobTitle}
Date: ${new Date().toLocaleDateString()}

═══════════════════════════════════════════════════════════════════════════════

FOR AGENT/BROKER USE ONLY

Submission Date: ${new Date().toLocaleDateString()}
Target Premium (All Lines): $${Math.floor(employees.reduce((sum, emp) => {
        const rateMap = {
          8810: 0.35, 8742: 0.42, 8292: 2.84, 8601: 0.29, 8832: 0.18,
          9014: 6.23, 3632: 4.82, 7380: 4.67, 7219: 8.89,
          5474: 2.88, 5645: 8.96, 5190: 4.19, 5538: 9.27, 5606: 4.44
        };
        return sum + (emp.annualSalary / 100 * (rateMap[emp.classificationCode] || 3.50));
      }, 0) * 1.5).toLocaleString()}
Account Notes: New business submission - ${company.industry} industry, ${employees.length} employees

═══════════════════════════════════════════════════════════════════════════════

END OF ACORD 125 APPLICATION

This is a specimen form for demonstration purposes. Actual ACORD 125 forms may vary by state and carrier.`
    );
    zip.file('acord-125-commercial-insurance-application-create-company-upload.docx', acord125Doc);

    const narrativeDoc = await createWordDocument(
      'Operations Narrative',
      `OPERATIONS NARRATIVE - ${company.name}

Business Overview:
${company.name} is a ${company.industry.toLowerCase()} company established in ${company.yearFounded}, headquartered in ${company.location}. ${company.description}

Operational Strengths:
• Experienced management team with ${new Date().getFullYear() - company.yearFounded} years of industry experience
• Comprehensive safety training programs for all employees
• Modern equipment and facilities with regular maintenance schedules
• Strong safety culture with monthly safety meetings and incident reporting
• OSHA compliance program with regular inspections

Risk Management:
• Employee safety training programs implemented
• Personal protective equipment (PPE) provided and required
• Regular safety inspections and hazard assessments
• Written safety policies and procedures
• Emergency response procedures established
• Workers compensation claims management program

Employee Information:
Total employees: ${employees.length}
Primary job classifications include:
${Array.from(new Set(employees.map(emp => emp.jobTitle))).map(title => {
        const empCount = employees.filter(e => e.jobTitle === title).length;
        const description = employees.find(e => e.jobTitle === title)?.description || '';
        return `• ${title} (${empCount} employee${empCount > 1 ? 's' : ''}) - ${description}`;
      }).join('\n')}

The company maintains a stable workforce with low turnover rates and comprehensive training programs for all positions.`
    );
    zip.file('operations-narrative-create-company-upload.docx', narrativeDoc);

    const coverageDoc = await createWordDocument(
      'Workers Compensation Coverage Recommendations',
      `WORKERS COMPENSATION COVERAGE RECOMMENDATIONS
${company.name}

Recommended Coverage Structure:

1. Basic Workers Compensation Coverage:
   - Coverage A: Workers Compensation - Statutory limits
   - Coverage B: Employers Liability - $1,000,000 each accident
   - $1,000,000 disease - policy limit
   - $1,000,000 disease - each employee

2. Additional Coverages Recommended:
   - Return to Work Program
   - Safety Dividend Plan (if available)
   - Experience Rating Modification Plan

3. Classification Analysis:
${(() => {
        const classificationMap = new Map();
        const rateMap = {
          8810: 0.35, 8742: 0.42, 8292: 2.84, 8601: 0.29, 8832: 0.18,
          9014: 6.23, 9102: 6.23, 3632: 4.82, 7380: 4.67, 7219: 8.89,
          5474: 2.88, 5645: 8.96, 5190: 4.19, 5538: 9.27, 5606: 4.44
        };

        employees.forEach(emp => {
          const code = emp.classificationCode;
          if (!classificationMap.has(code)) {
            classificationMap.set(code, {
              code, jobTitle: emp.jobTitle, count: 0, payroll: 0, rate: rateMap[code] || 3.50
            });
          }
          const c = classificationMap.get(code);
          c.count++; c.payroll += emp.annualSalary;
        });

        return Array.from(classificationMap.values()).map(c =>
          `   Class ${c.code} (${c.jobTitle}):\n   - Rate per $100: $${c.rate}\n   - Payroll: $${c.payroll.toLocaleString()}\n   - Estimated Premium: $${Math.floor(c.payroll / 100 * c.rate).toLocaleString()}`
        ).join('\n');
      })()}

4. Risk Improvement Recommendations:
   - Continue monthly safety meetings
   - Implement ergonomic assessments for repetitive tasks
   - Enhance return-to-work program
   - Consider safety incentive programs
   - Regular equipment maintenance schedules

5. Estimated Annual Premium: $${(() => {
        const rateMap = {
          8810: 0.35, 8742: 0.42, 8292: 2.84, 8601: 0.29, 8832: 0.18,
          9014: 6.23, 9102: 6.23, 3632: 4.82, 7380: 4.67, 7219: 8.89,
          5474: 2.88, 5645: 8.96, 5190: 4.19, 5538: 9.27, 5606: 4.44
        };
        return Math.floor(employees.reduce((sum, emp) => {
          const rate = rateMap[emp.classificationCode] || 3.50;
          return sum + (emp.annualSalary / 100 * rate);
        }, 0)).toLocaleString();
      })()}

Premium factors may vary based on experience modification, safety programs, and carrier underwriting guidelines.`
    );
    zip.file('coverage-recommendations-create-company-upload.docx', coverageDoc);

    // Add Prior Insurance History document (needed for ACORD 125 validation)
    const priorInsuranceHistory = `PRIOR INSURANCE HISTORY (5 YEARS)
${company.name}

===============================================
GENERAL LIABILITY COVERAGE HISTORY
===============================================

Policy Year 2024-2025:
- Carrier: Hartford Insurance Company
- Policy Number: GL-2024-558832
- Policy Period: 01/01/2024 - 01/01/2025
- General Aggregate Limit: $2,000,000
- Per Occurrence Limit: $1,000,000
- Products/Completed Operations: $2,000,000
- Personal & Advertising Injury: $1,000,000
- Annual Premium: $12,450
- Claims: 1 claim - $15,000 paid (slip and fall at job site)

Policy Year 2023-2024:
- Carrier: Hartford Insurance Company
- Policy Number: GL-2023-547291
- Policy Period: 01/01/2023 - 01/01/2024
- General Aggregate Limit: $2,000,000
- Per Occurrence Limit: $1,000,000
- Products/Completed Operations: $2,000,000
- Personal & Advertising Injury: $1,000,000
- Annual Premium: $11,800
- Claims: None

Policy Year 2022-2023:
- Carrier: Travelers Insurance
- Policy Number: GL-2022-TRV-9845
- Policy Period: 01/01/2022 - 01/01/2023
- General Aggregate Limit: $1,000,000
- Per Occurrence Limit: $1,000,000
- Products/Completed Operations: $1,000,000
- Personal & Advertising Injury: $1,000,000
- Annual Premium: $10,200
- Claims: 1 claim - $8,500 paid (property damage)

Policy Year 2021-2022:
- Carrier: Travelers Insurance
- Policy Number: GL-2021-TRV-9123
- Policy Period: 01/01/2021 - 01/01/2022
- General Aggregate Limit: $1,000,000
- Per Occurrence Limit: $1,000,000
- Products/Completed Operations: $1,000,000
- Personal & Advertising Injury: $1,000,000
- Annual Premium: $9,850
- Claims: None

Policy Year 2020-2021:
- Carrier: Travelers Insurance
- Policy Number: GL-2020-TRV-8756
- Policy Period: 01/01/2020 - 01/01/2021
- General Aggregate Limit: $1,000,000
- Per Occurrence Limit: $1,000,000
- Products/Completed Operations: $1,000,000
- Personal & Advertising Injury: $1,000,000
- Annual Premium: $9,400
- Claims: None

===============================================
COMMERCIAL AUTO COVERAGE HISTORY
===============================================

Policy Year 2024-2025:
- Carrier: Progressive Commercial
- Policy Number: CA-2024-PC-445566
- Policy Period: 01/01/2024 - 01/01/2025
- Number of Vehicles: 8 (4 trucks, 3 vans, 1 sedan)
- Combined Single Limit: $1,000,000
- Physical Damage: Comprehensive & Collision ($500 deductible)
- Uninsured/Underinsured Motorist: $1,000,000
- Annual Premium: $8,920
- Claims: 1 claim - $12,300 paid (rear-end collision, no injuries)

Policy Year 2023-2024:
- Carrier: Progressive Commercial
- Policy Number: CA-2023-PC-438821
- Policy Period: 01/01/2023 - 01/01/2024
- Number of Vehicles: 7 (3 trucks, 3 vans, 1 sedan)
- Combined Single Limit: $1,000,000
- Physical Damage: Comprehensive & Collision ($500 deductible)
- Uninsured/Underinsured Motorist: $1,000,000
- Annual Premium: $8,100
- Claims: None

Policy Year 2022-2023:
- Carrier: State Farm Business
- Policy Number: CA-2022-SF-778899
- Policy Period: 01/01/2022 - 01/01/2023
- Number of Vehicles: 6 (2 trucks, 3 vans, 1 sedan)
- Combined Single Limit: $500,000
- Physical Damage: Comprehensive & Collision ($1,000 deductible)
- Uninsured/Underinsured Motorist: $500,000
- Annual Premium: $6,850
- Claims: 1 claim - $4,200 paid (windshield replacement)

Policy Year 2021-2022:
- Carrier: State Farm Business
- Policy Number: CA-2021-SF-756432
- Policy Period: 01/01/2021 - 01/01/2022
- Number of Vehicles: 5 (2 trucks, 2 vans, 1 sedan)
- Combined Single Limit: $500,000
- Physical Damage: Comprehensive & Collision ($1,000 deductible)
- Uninsured/Underinsured Motorist: $500,000
- Annual Premium: $6,200
- Claims: None

Policy Year 2020-2021:
- Carrier: State Farm Business
- Policy Number: CA-2020-SF-732109
- Policy Period: 01/01/2020 - 01/01/2021
- Number of Vehicles: 4 (1 truck, 2 vans, 1 sedan)
- Combined Single Limit: $500,000
- Physical Damage: Comprehensive & Collision ($1,000 deductible)
- Uninsured/Underinsured Motorist: $500,000
- Annual Premium: $5,400
- Claims: None

===============================================
COMMERCIAL PROPERTY COVERAGE HISTORY
===============================================

Policy Year 2024-2025:
- Carrier: Chubb Insurance
- Policy Number: CP-2024-CH-992211
- Policy Period: 01/01/2024 - 01/01/2025
- Building Limit: $850,000 (office/warehouse at 123 Main St, Buffalo, NY)
- Business Personal Property: $425,000 (tools, equipment, inventory)
- Business Income: $250,000
- Equipment Breakdown: Included
- Deductible: $5,000
- Annual Premium: $6,750
- Claims: None

Policy Year 2023-2024:
- Carrier: Chubb Insurance
- Policy Number: CP-2023-CH-981045
- Policy Period: 01/01/2023 - 01/01/2024
- Building Limit: $800,000
- Business Personal Property: $400,000
- Business Income: $200,000
- Equipment Breakdown: Included
- Deductible: $5,000
- Annual Premium: $6,200
- Claims: None

Policy Year 2022-2023:
- Carrier: Liberty Mutual
- Policy Number: CP-2022-LM-665544
- Policy Period: 01/01/2022 - 01/01/2023
- Building Limit: $750,000
- Business Personal Property: $350,000
- Business Income: $150,000
- Equipment Breakdown: Not Included
- Deductible: $2,500
- Annual Premium: $5,100
- Claims: 1 claim - $18,500 paid (roof damage from storm)

Policy Year 2021-2022:
- Carrier: Liberty Mutual
- Policy Number: CP-2021-LM-654321
- Policy Period: 01/01/2021 - 01/01/2022
- Building Limit: $750,000
- Business Personal Property: $325,000
- Business Income: $150,000
- Equipment Breakdown: Not Included
- Deductible: $2,500
- Annual Premium: $4,900
- Claims: None

Policy Year 2020-2021:
- Carrier: Liberty Mutual
- Policy Number: CP-2020-LM-641278
- Policy Period: 01/01/2020 - 01/01/2021
- Building Limit: $700,000
- Business Personal Property: $300,000
- Business Income: $125,000
- Equipment Breakdown: Not Included
- Deductible: $2,500
- Annual Premium: $4,650
- Claims: None

===============================================
SUMMARY
===============================================

Total Premium History (All Lines):
- 2024-2025: $28,120
- 2023-2024: $26,100
- 2022-2023: $22,150
- 2021-2022: $20,950
- 2020-2021: $19,450

Total Claims (5 Years): 5 claims totaling $58,500

No policy cancellations or non-renewals in the past 5 years.
All policies renewed successfully with no coverage gaps.`;

    zip.file('prior-insurance-history-chat-upload.txt', priorInsuranceHistory);

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=workers-comp-test-data.zip',
      },
    });
  } catch (error) {
    console.error('Error generating test data:', error);
    return NextResponse.json(
      { error: 'Failed to generate test data' },
      { status: 500 }
    );
  }
}