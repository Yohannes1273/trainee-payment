import mongoose from '../models/db.js';
import Trainee from '../models/Trainee.js';
import User from '../models/User.js';
import Section from '../models/Section.js';
import Level from '../models/Level.js';
import EntryYear from '../models/EntryYear.js';
import Program from '../models/Program.js';
import Occupation from '../models/Occupation.js';
import Payment from '../models/Payment.js';
import AcademicHistory from '../models/AcademicHistory.js';

/**
 * Resolves full academic pathway for a given Section
 */
async function resolvePathway(sectionId) {
  const section = await Section.findById(sectionId);
  if (!section) return null;
  const level = await Level.findById(section.levelId);
  if (!level) return null;
  const entryYear = await EntryYear.findById(level.entryYearId);
  if (!entryYear) return null;
  const program = await Program.findById(entryYear.programId);
  if (!program) return null;
  const occupation = await Occupation.findById(program.occupationId);
  return {
    section,
    level,
    entryYear,
    program,
    occupation
  };
}

/**
 * Promoting a Trainee to the next Level
 */
export async function promoteTrainee(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { traineeId } = req.params;
    const { newLevel } = req.body; // e.g., 2, 3, 4

    if (!newLevel) {
      return res.status(400).json({ error: 'Please provide the new Level number for promotion.' });
    }

    const trainee = await Trainee.findById(traineeId);
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile not found.' });
    }

    const currentPathway = await resolvePathway(trainee.sectionId);
    if (!currentPathway) {
      return res.status(400).json({ error: 'Could not resolve trainee\'s current academic pathway.' });
    }

    const currentLevelNumber = currentPathway.level.levelNumber;

    if (Number(newLevel) <= currentLevelNumber) {
      return res.status(400).json({ error: `New level (${newLevel}) must be higher than current level (${currentLevelNumber}).` });
    }

    // 1. Verify financial prerequisites of the current/previous level
    const previousLevelPayments = await Payment.find({
      traineeId: trainee._id,
      levelNumber: currentLevelNumber
    });

    if (previousLevelPayments.length === 0) {
      return res.status(400).json({
        error: `Cannot promote. Student has no verified financial records for Level ${currentLevelNumber}.`
      });
    }

    const incompletePayments = previousLevelPayments.filter(
      p => !['Approved', 'Auto-Verified'].includes(p.status)
    );

    if (incompletePayments.length > 0) {
      return res.status(400).json({
        error: `Cannot promote. Student has incomplete financial requirements for Level ${currentLevelNumber}. All payments for this level must be Approved or Auto-Verified.`
      });
    }

    // 2. Locate the corresponding target Level document
    const programId = currentPathway.program._id;
    const entryYears = await EntryYear.find({ programId });
    const entryYearIds = entryYears.map(ey => ey._id);

    const targetLevel = await Level.findOne({
      levelNumber: Number(newLevel),
      entryYearId: { $in: entryYearIds }
    });

    if (!targetLevel) {
      return res.status(404).json({
        error: `Academic Level ${newLevel} is not configured for the student's program/occupation.`
      });
    }

    // 3. Find a section in the target level. 
    // We prioritize matching current section name (e.g., 'A'), fallback to first section.
    const targetSections = await Section.find({ levelId: targetLevel._id });
    if (targetSections.length === 0) {
      return res.status(400).json({
        error: `No sections are configured for academic Level ${newLevel}. Create sections for Level ${newLevel} first.`
      });
    }

    let targetSection = targetSections.find(s => s.name === currentPathway.section.name);
    if (!targetSection) {
      targetSection = targetSections[0];
    }

    // Verify section capacity
    const currentCount = await Trainee.countDocuments({ sectionId: targetSection._id });
    const maxCapacity = targetSection.maxCapacity || 30;
    if (currentCount >= maxCapacity) {
      return res.status(400).json({
        error: `Target section ${targetSection.name} of Level ${newLevel} is full (Capacity: ${maxCapacity}). Please balance or transfer to another section.`
      });
    }

    const targetEntryYear = entryYears.find(ey => ey._id === targetLevel.entryYearId);

    // Save current values for history snapshot
    const oldSectionId = trainee.sectionId;
    const oldLevel = trainee.level;

    // Apply updates
    trainee.level = Number(newLevel);
    trainee.sectionId = targetSection._id;
    if (targetEntryYear) {
      trainee.entryYear = targetEntryYear.year;
    }
    await trainee.save();

    // Create Immutable Audit Log
    await AcademicHistory.create({
      traineeId: trainee._id,
      type: 'Promotion',
      fromLevel: oldLevel || currentLevelNumber,
      toLevel: Number(newLevel),
      fromSectionId: oldSectionId,
      toSectionId: targetSection._id,
      registrarUserId: req.user.id,
      reason: `Promoted from Level ${oldLevel || currentLevelNumber} to Level ${newLevel}.`
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: `Trainee promoted to Level ${newLevel} (Section ${targetSection.name}) successfully.`,
      trainee
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
}

/**
 * Section Transfer with validations and capacity checks
 */
export async function transferSection(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { traineeId } = req.params;
    const { newSectionId } = req.body;

    if (!newSectionId) {
      return res.status(400).json({ error: 'Please specify the target Section for transfer.' });
    }

    const trainee = await Trainee.findById(traineeId);
    if (!trainee) {
      return res.status(404).json({ error: 'Trainee profile not found.' });
    }

    if (trainee.sectionId === newSectionId) {
      return res.status(400).json({ error: 'Trainee is already in the selected section.' });
    }

    const currentPathway = await resolvePathway(trainee.sectionId);
    const newPathway = await resolvePathway(newSectionId);

    if (!currentPathway || !newPathway) {
      return res.status(400).json({ error: 'Could not resolve the current or target academic pathway.' });
    }

    // Check capacity constraint
    const currentCount = await Trainee.countDocuments({ sectionId: newSectionId });
    const maxCapacity = newPathway.section.maxCapacity || 30;
    if (currentCount >= maxCapacity) {
      return res.status(400).json({
        error: `The target section ${newPathway.section.name} is full. Capacity is capped at ${maxCapacity} trainees.`
      });
    }

    // Validate Academic Transfer belongs to the same Level number, Program and Occupation
    const sameLevel = currentPathway.level.levelNumber === newPathway.level.levelNumber;
    const sameProgram = currentPathway.program.name === newPathway.program.name;
    const sameOccupation = currentPathway.occupation.name === newPathway.occupation.name;

    if (!sameLevel || !sameProgram || !sameOccupation) {
      return res.status(400).json({
        error: 'Invalid academic transfer. Students can only be transferred to sections within the same Level, Program, and Occupation.'
      });
    }

    const oldSectionId = trainee.sectionId;

    // Apply Transfer
    trainee.sectionId = newSectionId;
    await trainee.save();

    // Create Immutable Audit Log
    await AcademicHistory.create({
      traineeId: trainee._id,
      type: 'Transfer',
      fromLevel: currentPathway.level.levelNumber,
      toLevel: newPathway.level.levelNumber,
      fromSectionId: oldSectionId,
      toSectionId: newSectionId,
      registrarUserId: req.user.id,
      reason: `Transferred from Section ${currentPathway.section.name} to Section ${newPathway.section.name}.`
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: `Trainee transferred to Section ${newPathway.section.name} successfully.`,
      trainee
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
}

/**
 * Section Balancing Service: Proposes a balanced distribution across Sections A, B, and C
 */
export async function proposeSectionBalancing(req, res) {
  try {
    const { levelId } = req.params;
    const maxCapacity = Number(req.query.maxCapacity) || 30;

    const sections = await Section.find({ levelId });
    if (sections.length === 0) {
      return res.status(404).json({ error: 'No sections configured for this Level.' });
    }

    const sectionIds = sections.map(s => s._id);
    const trainees = await Trainee.find({ sectionId: { $in: sectionIds } });

    if (trainees.length === 0) {
      return res.json({
        totalTrainees: 0,
        maxCapacity,
        exceedsCapacity: false,
        sections: sections.map(s => s.name),
        proposal: []
      });
    }

    // Enrich with user profile names
    const proposal = [];
    for (const t of trainees) {
      const user = await User.findById(t.userId);
      const currentSec = sections.find(s => s._id === t.sectionId);
      proposal.push({
        traineeId: t._id,
        fullName: user ? user.fullName : 'Unknown Trainee',
        rollNumber: t.rollNumber,
        currentSectionId: t.sectionId,
        currentSectionName: currentSec ? currentSec.name : 'N/A'
      });
    }

    // Sort alphabetically to maintain determinism
    proposal.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Propose balanced distribution across Sections A, B, and C
    const sectionsToBalance = ['A', 'B', 'C'];
    proposal.forEach((item, index) => {
      item.proposedSectionName = sectionsToBalance[index % 3];
    });

    res.json({
      totalTrainees: trainees.length,
      maxCapacity,
      exceedsCapacity: trainees.length > maxCapacity,
      sections: sections.map(s => s.name),
      proposal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Section Balancing Service: Executes section balancing with one click
 */
export async function autoAssignSectionBalancing(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { levelId } = req.params;

    // 1. Ensure Sections A, B, and C exist for this level
    let secA = await Section.findOne({ levelId, name: 'A' });
    if (!secA) {
      secA = await Section.create({ name: 'A', levelId });
    }

    let secB = await Section.findOne({ levelId, name: 'B' });
    if (!secB) {
      secB = await Section.create({ name: 'B', levelId });
    }

    let secC = await Section.findOne({ levelId, name: 'C' });
    if (!secC) {
      secC = await Section.create({ name: 'C', levelId });
    }

    // 2. Fetch all current sections and trainees for this Level
    const sections = await Section.find({ levelId });
    const sectionIds = sections.map(s => s._id);
    const trainees = await Trainee.find({ sectionId: { $in: sectionIds } });

    if (trainees.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return res.json({ message: 'No trainees found under this level to balance.' });
    }

    // 3. Resolve user names and sort
    const enriched = [];
    for (const t of trainees) {
      const user = await User.findById(t.userId);
      enriched.push({
        trainee: t,
        fullName: user ? user.fullName : 'Unknown Trainee'
      });
    }
    enriched.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // 4. Update section assignments round-robin across A, B, C
    const proposedSections = [secA, secB, secC];
    
    for (let index = 0; index < enriched.length; index++) {
      const { trainee, fullName } = enriched[index];
      const targetSec = proposedSections[index % 3];
      const oldSectionId = trainee.sectionId;

      if (oldSectionId !== targetSec._id) {
        trainee.sectionId = targetSec._id;
        await trainee.save();

        // Log balancing audit log
        await AcademicHistory.create({
          traineeId: trainee._id,
          type: 'Transfer',
          fromLevel: trainee.level || 1,
          toLevel: trainee.level || 1,
          fromSectionId: oldSectionId,
          toSectionId: targetSec._id,
          registrarUserId: req.user.id,
          reason: `Auto-balanced and auto-assigned student ${fullName} to Section ${targetSec.name}.`
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Successfully balanced and auto-assigned ${trainees.length} trainees across sections A, B, and C.`
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
}

/**
 * Fetch Academic Audits Log for the Registrar
 */
export async function getAcademicHistory(req, res) {
  try {
    const history = await AcademicHistory.find({});
    
    const enriched = [];
    for (const h of history) {
      const trainee = await Trainee.findById(h.traineeId);
      let traineeName = 'Unknown';
      let rollNumber = 'N/A';
      if (trainee) {
        const user = await User.findById(trainee.userId);
        traineeName = user ? user.fullName : 'Unknown';
        rollNumber = trainee.rollNumber;
      }

      const registrarUser = await User.findById(h.registrarUserId);
      const registrarName = registrarUser ? registrarUser.fullName : 'System / Registrar';

      const fromSection = h.fromSectionId ? await Section.findById(h.fromSectionId) : null;
      const toSection = h.toSectionId ? await Section.findById(h.toSectionId) : null;

      enriched.push({
        _id: h._id,
        traineeName,
        rollNumber,
        type: h.type,
        fromLevel: h.fromLevel,
        toLevel: h.toLevel,
        fromSectionName: fromSection ? fromSection.name : 'N/A',
        toSectionName: toSection ? toSection.name : 'N/A',
        dateOfTransfer: h.dateOfTransfer,
        registrarName,
        reason: h.reason
      });
    }

    // Sort newest first
    enriched.sort((a, b) => new Date(b.dateOfTransfer) - new Date(a.dateOfTransfer));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Fetch all registered trainees with full resolved pathways
 */
export async function getTraineesList(req, res) {
  try {
    const trainees = await Trainee.find({});
    const enriched = [];
    for (const t of trainees) {
      const user = await User.findById(t.userId);
      const path = await resolvePathway(t.sectionId);
      enriched.push({
        _id: t._id,
        userId: t.userId,
        fullName: user ? user.fullName : 'Unknown',
        email: user ? user.email : '',
        rollNumber: t.rollNumber,
        level: t.level || (path ? path.level.levelNumber : 1),
        sectionId: t.sectionId,
        sectionName: path ? path.section.name : 'N/A',
        programName: path ? path.program.name : 'N/A',
        occupationName: path ? path.occupation.name : 'N/A',
        admissionStatus: t.admissionStatus || 'Active'
      });
    }
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const registrarController = {
  promoteTrainee,
  transferSection,
  proposeSectionBalancing,
  autoAssignSectionBalancing,
  getAcademicHistory,
  getTraineesList
};

export default registrarController;
