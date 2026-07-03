import Department from '../models/Department.js';
import Occupation from '../models/Occupation.js';
import Program from '../models/Program.js';
import EntryYear from '../models/EntryYear.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import Trainee from '../models/Trainee.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

/**
 * Generates a tabular, flattened payment audit dataset with full academic trace 
 * and institutional metadata headers, optionally filtered by academic selectors.
 */
export async function generateReportData(filters = {}) {
  const departments = await Department.find({});
  const occupations = await Occupation.find({});
  const programs = await Program.find({});
  const entryYears = await EntryYear.find({});
  const levels = await Level.find({});
  const sections = await Section.find({});
  const trainees = await Trainee.find({});
  const payments = await Payment.find({});
  const users = await User.find({});

  const flatRows = [];

  for (const dept of departments) {
    if (filters.departmentId && dept._id !== filters.departmentId) continue;

    const deptOccs = occupations.filter(o => o.departmentId === dept._id);
    for (const occ of deptOccs) {
      if (filters.occupationId && occ._id !== filters.occupationId) continue;

      const occProgs = programs.filter(p => p.occupationId === occ._id);
      for (const prog of occProgs) {
        const progYears = entryYears.filter(y => y.programId === prog._id);
        for (const yr of progYears) {
          const yrLvls = levels.filter(l => l.entryYearId === yr._id);
          for (const lvl of yrLvls) {
            if (filters.levelId && lvl._id !== filters.levelId) continue;

            const lvlSecs = sections.filter(s => s.levelId === lvl._id);
            for (const sec of lvlSecs) {
              if (filters.sectionId && sec._id !== filters.sectionId) continue;

              const secTrainees = trainees.filter(t => t.sectionId === sec._id);
              const trainerUser = users.find(u => u._id === sec.trainerId);

              for (const trainee of secTrainees) {
                const traineeUser = users.find(u => u._id === trainee.userId);
                const traineePayments = payments.filter(p => p.traineeId === trainee._id);

                if (traineePayments.length === 0) {
                  flatRows.push({
                    departmentName: dept.name,
                    occupationName: occ.name,
                    programName: prog.name,
                    entryYear: yr.year,
                    levelNumber: lvl.levelNumber,
                    sectionName: sec.name,
                    trainerName: trainerUser ? trainerUser.fullName : 'None Assigned',
                    traineeName: traineeUser ? traineeUser.fullName : 'Unknown Student',
                    rollNumber: trainee.rollNumber,
                    status: trainee.admissionStatus,
                    paymentId: 'N/A',
                    paymentStatus: 'No Payments',
                    amountPaid: 0,
                    paidDate: null,
                    dueDate: null,
                    penaltyDaysLate: 0,
                    penaltyAmount: 0
                  });
                } else {
                  for (const payment of traineePayments) {
                    flatRows.push({
                      departmentName: dept.name,
                      occupationName: occ.name,
                      programName: prog.name,
                      entryYear: yr.year,
                      levelNumber: lvl.levelNumber,
                      sectionName: sec.name,
                      trainerName: trainerUser ? trainerUser.fullName : 'None Assigned',
                      traineeName: traineeUser ? traineeUser.fullName : 'Unknown Student',
                      rollNumber: trainee.rollNumber,
                      status: trainee.admissionStatus,
                      paymentId: payment._id,
                      paymentStatus: payment.status,
                      amountPaid: payment.amountPaid,
                      paidDate: payment.paidDate,
                      dueDate: payment.dueDate,
                      penaltyDaysLate: payment.penaltyDaysLate,
                      penaltyAmount: payment.penaltyAmount
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Institutional meta-data header as required by specifications
  const reportHeader = {
    collegeName: 'National Polytechnic College of Ethiopia',
    reportTitle: 'TRAINEE PAYMENT AUDIT & FINANCIAL COMPLIANCE REPORT',
    generatedAt: new Date().toISOString(),
    documentClass: 'CONFIDENTIAL // OFFICIAL INSTITUTIONAL RECORD',
    academicPeriod: 'Academic Session 2024 - 2025'
  };

  return {
    header: reportHeader,
    data: flatRows,
    filtersApplied: filters
  };
}

const reportService = {
  generateReportData
};

export default reportService;
