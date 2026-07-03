import reportService from '../services/reportService.js';
import AuditLog from '../models/AuditLog.js';
import Department from '../models/Department.js';
import Occupation from '../models/Occupation.js';
import Program from '../models/Program.js';
import EntryYear from '../models/EntryYear.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import Trainee from '../models/Trainee.js';
import Payment, { LEVEL_RATES } from '../models/Payment.js';
import User from '../models/User.js';

// Fee Calculation helper based on traineeController
function getExpectedFee(programName, levelNumber) {
  const levelNum = parseInt(levelNumber, 10) || 1;
  if (programName === 'Regular') {
    return 300; // 2 blocks * 150 ETB
  } else if (programName === 'Extension' || programName === 'Weekend') {
    const rate = LEVEL_RATES[levelNum] || 175;
    return rate * 12; // 4 blocks * 3 months * rate
  } else if (programName === 'Short Term') {
    return 3500; // Flat fee
  }
  return 300; // Default fallback
}

// Traverse upwards to build breadcrumbs
async function buildBreadcrumbs(level, parentId) {
  const crumbs = [{ name: 'All Departments', level: 'root', id: '' }];
  if (!level || level === 'root' || !parentId) {
    return crumbs;
  }

  let dept = null;
  let occ = null;
  let prog = null;
  let entryYear = null;
  let lvl = null;
  let sec = null;

  try {
    if (level === 'section') {
      sec = await Section.findById(parentId);
      if (sec) lvl = await Level.findById(sec.levelId);
      if (lvl) entryYear = await EntryYear.findById(lvl.entryYearId);
      if (entryYear) prog = await Program.findById(entryYear.programId);
      if (prog) occ = await Occupation.findById(prog.occupationId);
      if (occ) dept = await Department.findById(occ.departmentId);
    } else if (level === 'level') {
      lvl = await Level.findById(parentId);
      if (lvl) entryYear = await EntryYear.findById(lvl.entryYearId);
      if (entryYear) prog = await Program.findById(entryYear.programId);
      if (prog) occ = await Occupation.findById(prog.occupationId);
      if (occ) dept = await Department.findById(occ.departmentId);
    } else if (level === 'entryyear') {
      entryYear = await EntryYear.findById(parentId);
      if (entryYear) prog = await Program.findById(entryYear.programId);
      if (prog) occ = await Occupation.findById(prog.occupationId);
      if (occ) dept = await Department.findById(occ.departmentId);
    } else if (level === 'program') {
      prog = await Program.findById(parentId);
      if (prog) occ = await Occupation.findById(prog.occupationId);
      if (occ) dept = await Department.findById(occ.departmentId);
    } else if (level === 'occupation') {
      occ = await Occupation.findById(parentId);
      if (occ) dept = await Department.findById(occ.departmentId);
    } else if (level === 'department') {
      dept = await Department.findById(parentId);
    }

    if (dept) crumbs.push({ name: dept.name, level: 'department', id: dept._id });
    if (occ) crumbs.push({ name: occ.name, level: 'occupation', id: occ._id });
    if (prog) crumbs.push({ name: prog.name, level: 'program', id: prog._id });
    if (entryYear) crumbs.push({ name: `${entryYear.year}`, level: 'entryyear', id: entryYear._id });
    if (lvl) crumbs.push({ name: `Level ${lvl.levelNumber}`, level: 'level', id: lvl._id });
    if (sec) crumbs.push({ name: sec.name, level: 'section', id: sec._id });
  } catch (error) {
    console.error('Error building breadcrumbs:', error);
  }

  return crumbs;
}

/**
 * Handles generating flat audit reports with institutional metadata,
 * enforcing access and logging audit trails in AuditLog.
 */
export async function generateReport(req, res) {
  try {
    const filters = req.body || {};

    // 1. Compile the report data using our report service
    const report = await reportService.generateReportData(filters);

    // 2. Log this action inside the AuditLog model
    await AuditLog.create({
      actionType: 'Report Generated',
      performedBy: req.user.id,
      performedByName: req.user.fullName || 'System',
      targetEntity: 'Report',
      details: {
        filters,
        recordCount: report.data.length,
        documentClass: report.header.documentClass
      }
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Retrieves the historical audit logs for auditing transparency
 */
export async function getAuditLogs(req, res) {
  try {
    const logs = await AuditLog.find({});
    // Return logs sorted chronologically descending
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(sortedLogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Dynamic financial aggregation drill-down reporting engine
 */
export async function getFinancialReport(req, res) {
  try {
    const level = req.query.level ? req.query.level.toLowerCase() : 'root';
    const parentId = req.query.id || '';

    // Load full relational database in memory for speed & flexibility with mock DB
    const departments = await Department.find({});
    const occupations = await Occupation.find({});
    const programs = await Program.find({});
    const entryYears = await EntryYear.find({});
    const levels = await Level.find({});
    const sections = await Section.find({});
    const trainees = await Trainee.find({});
    const payments = await Payment.find({});
    const users = await User.find({});

    // Calculate metrics for ALL trainees first
    const traineeMetrics = trainees.map(t => {
      const sec = sections.find(s => s._id === t.sectionId);
      const lvl = sec ? levels.find(l => l._id === sec.levelId) : null;
      const entry = lvl ? entryYears.find(e => e._id === lvl.entryYearId) : null;
      const prog = entry ? programs.find(p => p._id === entry.programId) : null;
      const occ = prog ? occupations.find(o => o._id === prog.occupationId) : null;
      const dept = occ ? departments.find(d => d._id === occ.departmentId) : null;

      const traineePayments = payments.filter(p => p.traineeId === t._id && ['Approved', 'Auto-Verified'].includes(p.status));
      const totalPaid = traineePayments.reduce((sum, p) => sum + p.amountPaid, 0);

      const programName = prog ? prog.name : 'Regular';
      const levelNumber = lvl ? lvl.levelNumber : 1;
      const expectedFee = getExpectedFee(programName, levelNumber);
      const revenueGap = Math.max(0, expectedFee - totalPaid);

      return {
        traineeId: t._id,
        userId: t.userId,
        sectionId: t.sectionId,
        levelId: lvl ? lvl._id : null,
        entryYearId: entry ? entry._id : null,
        programId: prog ? prog._id : null,
        occupationId: occ ? occ._id : null,
        departmentId: dept ? dept._id : null,
        totalPaid,
        expectedFee,
        revenueGap
      };
    });

    let currentLevel = {
      name: 'All Departments',
      level: 'root',
      id: '',
      totalPaid: 0,
      expectedFee: 0,
      revenueGap: 0,
      traineeCount: traineeMetrics.length
    };

    let breakdown = [];

    // Filter list helper
    const sumTraineeMetrics = (filtered) => {
      const totalPaid = filtered.reduce((sum, t) => sum + t.totalPaid, 0);
      const expectedFee = filtered.reduce((sum, t) => sum + t.expectedFee, 0);
      const revenueGap = filtered.reduce((sum, t) => sum + t.revenueGap, 0);
      return { totalPaid, expectedFee, revenueGap, traineeCount: filtered.length };
    };

    if (level === 'root' || !level) {
      const totals = sumTraineeMetrics(traineeMetrics);
      currentLevel = { ...currentLevel, ...totals };

      breakdown = departments.map(dept => {
        const deptTrainees = traineeMetrics.filter(t => t.departmentId === dept._id);
        return {
          id: dept._id,
          name: dept.name,
          nextLevel: 'department',
          ...sumTraineeMetrics(deptTrainees)
        };
      });
    } 
    else if (level === 'department') {
      const dept = departments.find(d => d._id === parentId);
      if (!dept) {
        return res.status(404).json({ error: `Department not found: ${parentId}` });
      }

      const deptTrainees = traineeMetrics.filter(t => t.departmentId === parentId);
      currentLevel = {
        name: dept.name,
        level: 'department',
        id: dept._id,
        ...sumTraineeMetrics(deptTrainees)
      };

      const deptOccs = occupations.filter(o => o.departmentId === parentId);
      breakdown = deptOccs.map(occ => {
        const occTrainees = traineeMetrics.filter(t => t.occupationId === occ._id);
        return {
          id: occ._id,
          name: occ.name,
          nextLevel: 'occupation',
          ...sumTraineeMetrics(occTrainees)
        };
      });
    } 
    else if (level === 'occupation') {
      const occ = occupations.find(o => o._id === parentId);
      if (!occ) {
        return res.status(404).json({ error: `Occupation not found: ${parentId}` });
      }

      const occTrainees = traineeMetrics.filter(t => t.occupationId === parentId);
      currentLevel = {
        name: occ.name,
        level: 'occupation',
        id: occ._id,
        ...sumTraineeMetrics(occTrainees)
      };

      const occProgs = programs.filter(p => p.occupationId === parentId);
      breakdown = occProgs.map(prog => {
        const progTrainees = traineeMetrics.filter(t => t.programId === prog._id);
        return {
          id: prog._id,
          name: prog.name,
          nextLevel: 'program',
          ...sumTraineeMetrics(progTrainees)
        };
      });
    } 
    else if (level === 'program') {
      const prog = programs.find(p => p._id === parentId);
      if (!prog) {
        return res.status(404).json({ error: `Program not found: ${parentId}` });
      }

      const progTrainees = traineeMetrics.filter(t => t.programId === parentId);
      currentLevel = {
        name: prog.name,
        level: 'program',
        id: prog._id,
        ...sumTraineeMetrics(progTrainees)
      };

      const progYears = entryYears.filter(e => e.programId === parentId);
      breakdown = progYears.map(ey => {
        const eyTrainees = traineeMetrics.filter(t => t.entryYearId === ey._id);
        return {
          id: ey._id,
          name: `Entry Year ${ey.year}`,
          nextLevel: 'entryyear',
          ...sumTraineeMetrics(eyTrainees)
        };
      });
    } 
    else if (level === 'entryyear') {
      const ey = entryYears.find(e => e._id === parentId);
      if (!ey) {
        return res.status(404).json({ error: `Entry Year not found: ${parentId}` });
      }

      const eyTrainees = traineeMetrics.filter(t => t.entryYearId === parentId);
      currentLevel = {
        name: `Entry Year ${ey.year}`,
        level: 'entryyear',
        id: ey._id,
        ...sumTraineeMetrics(eyTrainees)
      };

      const eyLvls = levels.filter(l => l.entryYearId === parentId);
      breakdown = eyLvls.map(lvl => {
        const lvlTrainees = traineeMetrics.filter(t => t.levelId === lvl._id);
        return {
          id: lvl._id,
          name: `Level ${lvl.levelNumber}`,
          nextLevel: 'level',
          ...sumTraineeMetrics(lvlTrainees)
        };
      });
    } 
    else if (level === 'level') {
      const lvl = levels.find(l => l._id === parentId);
      if (!lvl) {
        return res.status(404).json({ error: `Level not found: ${parentId}` });
      }

      const lvlTrainees = traineeMetrics.filter(t => t.levelId === parentId);
      currentLevel = {
        name: `Level ${lvl.levelNumber}`,
        level: 'level',
        id: lvl._id,
        ...sumTraineeMetrics(lvlTrainees)
      };

      const lvlSecs = sections.filter(s => s.levelId === parentId);
      breakdown = lvlSecs.map(sec => {
        const secTrainees = traineeMetrics.filter(t => t.sectionId === sec._id);
        return {
          id: sec._id,
          name: `Section ${sec.name}`,
          nextLevel: 'section',
          ...sumTraineeMetrics(secTrainees)
        };
      });
    } 
    else if (level === 'section') {
      const sec = sections.find(s => s._id === parentId);
      if (!sec) {
        return res.status(404).json({ error: `Section not found: ${parentId}` });
      }

      const secTrainees = traineeMetrics.filter(t => t.sectionId === parentId);
      currentLevel = {
        name: `Section ${sec.name}`,
        level: 'section',
        id: sec._id,
        ...sumTraineeMetrics(secTrainees)
      };

      // Breakdown down to Trainee level
      const traineesInSec = trainees.filter(t => t.sectionId === parentId);
      breakdown = traineesInSec.map(t => {
        const u = users.find(user => user._id === t.userId);
        const metric = traineeMetrics.find(m => m.traineeId === t._id) || { totalPaid: 0, expectedFee: 0, revenueGap: 0 };
        return {
          id: t._id,
          name: u ? u.fullName : `Trainee (${t.rollNumber})`,
          rollNumber: t.rollNumber,
          nextLevel: 'trainee',
          totalPaid: metric.totalPaid,
          expectedFee: metric.expectedFee,
          revenueGap: metric.revenueGap,
          traineeCount: 1
        };
      });
    }

    const breadcrumbs = await buildBreadcrumbs(level, parentId);

    res.json({
      currentLevel,
      breadcrumbs,
      breakdown
    });
  } catch (error) {
    console.error('Error generating drill-down financial report:', error);
    res.status(500).json({ error: error.message });
  }
}

const reportController = {
  generateReport,
  getAuditLogs,
  getFinancialReport
};

export default reportController;
