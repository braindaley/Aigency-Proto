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
      `ACORD 130 (2013/09)
WORKERS COMPENSATION APPLICATION

AGENCY INFORMATION:
Agency Name: ${company.industry === 'Construction' ? 'Premier Construction Insurance Services' :
              company.industry === 'Manufacturing' ? 'Industrial Risk Management Services' :
              'Commercial Insurance Solutions LLC'}
Producer Name: ${['Michael Johnson, CIC', 'Sarah Davis, CPCU', 'Robert Wilson, CIC', 'Jennifer Martinez, CPCU'][Math.floor(Math.random() * 4)]}
Agency Phone: (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}

APPLICANT INFORMATION:
Business Name: ${company.name}
Mailing Address: ${['123 Business Blvd', '456 Commerce St', '789 Industry Ave'][Math.floor(Math.random() * 3)]}
${company.location}
Website: ${company.website}

Federal Employer ID Number: ${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000000 + Math.random() * 8999999)}
Years in Business: ${new Date().getFullYear() - company.yearFounded}
SIC Code: ${company.industry === 'Construction' ? '1542' : company.industry === 'Manufacturing' ? '3599' : '4225'}
NAICS Code: ${company.industry === 'Construction' ? '236220' : company.industry === 'Manufacturing' ? '332999' : '493110'}

Business Type: ☒ Corporation  ☐ LLC  ☐ Partnership  ☐ Sole Proprietor

POLICY INFORMATION:
Proposed Effective Date: ${new Date().toLocaleDateString()}
Proposed Expiration Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString()}

Coverage Limits:
Part 1 - Workers Compensation: Statutory
Part 2 - Employer's Liability:
  Each Accident: $1,000,000
  Disease - Policy Limit: $1,000,000
  Disease - Each Employee: $1,000,000

LOCATIONS:
Location #1:
${['123 Business Blvd', '456 Commerce St', '789 Industry Ave'][Math.floor(Math.random() * 3)]}
${company.location}

RATING INFORMATION - Classification Codes and Payroll:

${(() => {
        const classificationMap = new Map();
        const classificationDescriptions = {
          8810: 'Clerical Office Employees',
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

        return Array.from(classificationMap.values()).map(c =>
          `Class Code: ${c.code} - ${c.description}
   Employees: ${c.count}
   Annual Payroll: $${c.payroll.toLocaleString()}`
        ).join('\n\n');
      })()}

INDIVIDUALS TO BE INCLUDED/EXCLUDED:
${employees.slice(0, 3).map(emp =>
  `Name: ${emp.name}
   Title: ${emp.jobTitle}
   Ownership %: ${emp.jobTitle.toLowerCase().includes('ceo') || emp.jobTitle.toLowerCase().includes('owner') ? '100.0' : '0.0'}
   Classification: ${emp.classificationCode}
   Include/Exclude: ${emp.jobTitle.toLowerCase().includes('ceo') || emp.jobTitle.toLowerCase().includes('owner') ? 'E' : 'I'}`
).join('\n\n')}

PRIOR CARRIER INFORMATION (Last 5 Years):
${(() => {
  const carriers = ['State Compensation Insurance Fund', 'Liberty Mutual', 'Travelers Insurance', 'The Hartford', 'Zurich Insurance'];
  const currentYear = new Date().getFullYear();
  let priorInfo = '';

  for (let i = 1; i <= 5; i++) {
    const year = currentYear - i;
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    const premium = Math.floor(Math.random() * 500000) + 100000;
    const mod = (0.8 + Math.random() * 0.6).toFixed(2);
    const claims = Math.floor(Math.random() * 10);
    const paidAmount = claims * (Math.floor(Math.random() * 50000) + 10000);
    const reserveAmount = Math.floor(paidAmount * 0.3);

    priorInfo += `${year}: ${carrier}
   Annual Premium: $${premium.toLocaleString()}
   Experience Mod: ${mod}
   # Claims: ${claims}
   Amount Paid: $${paidAmount.toLocaleString()}
   Reserve: $${reserveAmount.toLocaleString()}

`;
  }
  return priorInfo;
})()}

NATURE OF BUSINESS:
${company.industry === 'Construction' ? 'Residential Framer' :
  company.industry === 'Manufacturing' ? 'Precision metal component manufacturing' :
  'Warehouse and distribution operations'}

${company.description}

GENERAL INFORMATION:
1. Does applicant own, operate or lease aircraft/watercraft? NO
2. Do operations involve hazardous materials? NO
3. Any work performed underground or above 15 feet? ${company.industry === 'Construction' ? 'YES' : 'NO'}
4. Any work performed on barges, vessels, docks, bridges over water? NO
5. Is applicant engaged in any other type of business? NO
6. Are sub-contractors used? ${company.industry === 'Construction' ? 'NO' : 'NO'}
7. Any work sublet without certificates of insurance? NO
8. Is a written safety program in operation? YES
9. Any group transportation provided? NO
10. Any employees under 16 or over 60 years of age? NO
11. Any seasonal employees? ${Math.random() > 0.7 ? 'YES' : 'NO'}
12. Is there any volunteer or donated labor? NO
13. Any employees with physical handicaps? NO
14. Do employees travel out of state? NO
15. Are athletic teams sponsored? NO
16. Are physicals required after offers of employment? NO
17. Any other insurance with this insurer? NO
18. Any prior coverage declined/cancelled/non-renewed? NO
19. Are employee health plans provided? YES
20. Do employees perform work for other businesses? NO
21. Do you lease employees to/from other employers? NO
22. Do employees predominantly work at home? NO
23. Any tax liens or bankruptcy within last 5 years? NO
24. Any undisputed workers compensation premium due? NO

REMARKS:
${company.industry === 'Construction' ?
  '30 DAYS NOTICE OF CANCELLATION AND INCLUDE A BLANKET WAIVER OF SUBROGATION. Field laborers work part-time occasionally.' :
  'Standard commercial operations with comprehensive safety programs in place.'}

The undersigned represents that reasonable inquiry has been made to obtain the answers to questions on this application and that the answers are true, correct and complete to the best of their knowledge.

APPLICANT SIGNATURE: ___________________________ DATE: ${new Date().toLocaleDateString()}

TOTAL ESTIMATED ANNUAL PREMIUM: $${(() => {
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
      })()}`
    );
    zip.file('acord-130-workers-comp-application-create-company-upload.docx', acord130Doc);

    const acord125Doc = await createWordDocument(
      'ACORD 125 - Commercial Insurance Application',
      `COMMERCIAL INSURANCE APPLICATION
ACORD Form 125

General Information:
Business Name: ${company.name}
Business Description: ${company.description}
Years in Business: ${new Date().getFullYear() - company.yearFounded}
Website: ${company.website}
Business Structure: LLC
SIC Code: ${company.industry === 'Manufacturing' ? '3599' : company.industry === 'Construction' ? '1542' : '4225'}

Requested Coverage:
- General Liability: $2,000,000 per occurrence / $4,000,000 aggregate
- Commercial Property: $${Math.floor(Math.random() * 5000000 + 1000000).toLocaleString()}
- Commercial Auto: $1,000,000 combined single limit
- Workers Compensation: As required by state law
- Umbrella: $5,000,000

Operations Description:
Primary operations involve ${company.description.toLowerCase()}. Business operates from ${company.location} with ${company.employeeCount} employees.`
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