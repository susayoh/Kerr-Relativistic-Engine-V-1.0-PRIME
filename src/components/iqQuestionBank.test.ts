import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GARDNER_INTELLIGENCES,
  sampleRandomizedIQQuestions,
  computeMultipleIntelligencesProfile,
  type GardnerIntelligenceId,
} from './iqQuestionBank';
import { MASTER_IQ_QUESTION_DATABASE } from './IQTestModule';
import {
  buildPostTestTelemetryReport,
  buildCalibrationPreviewTelemetryReport,
  normalCdfPercentile,
  SEED_GROWTH_HISTORY,
  appendReportToGrowthHistory,
  computeGrowthAnalyticsSummaries,
} from './iqTelemetryEngine';

test('Howard Gardner 9 Multiple Intelligences metadata covers all 9 primary domains', () => {
  assert.equal(GARDNER_INTELLIGENCES.length, 9);
  const expectedDomains: Array<[GardnerIntelligenceId, string]> = [
    ['linguistic', 'Word Smart'],
    ['logical_mathematical', 'Number/Reasoning Smart'],
    ['spatial', 'Picture Smart'],
    ['musical', 'Music Smart'],
    ['bodily_kinesthetic', 'Body Smart'],
    ['interpersonal', 'People Smart'],
    ['intrapersonal', 'Self Smart'],
    ['naturalist', 'Nature Smart'],
    ['existential', 'Philosophy Smart'],
  ];

  expectedDomains.forEach(([id, smartTitle], idx) => {
    assert.equal(GARDNER_INTELLIGENCES[idx].id, id);
    assert.equal(GARDNER_INTELLIGENCES[idx].smartTitle, smartTitle);
    assert.ok(GARDNER_INTELLIGENCES[idx].psychometricTestTitle.length > 5);
    assert.ok(GARDNER_INTELLIGENCES[idx].description.length > 10);
  });
});

test('MASTER_IQ_QUESTION_DATABASE has unique IDs and >= 7 items per each of the 9 intelligences', () => {
  assert.ok(MASTER_IQ_QUESTION_DATABASE.length >= 80);
  const ids = new Set(MASTER_IQ_QUESTION_DATABASE.map((q) => q.id));
  assert.equal(ids.size, MASTER_IQ_QUESTION_DATABASE.length);

  for (const intel of GARDNER_INTELLIGENCES) {
    const count = MASTER_IQ_QUESTION_DATABASE.filter((q) => q.gardnerDomain === intel.id).length;
    assert.ok(
      count >= 7,
      `Expected at least 7 questions for ${intel.id}, found ${count}`
    );
  }
});

test('sampleRandomizedIQQuestions draws stratified sets including observatory_24 (Q1-Q24) and all 9 individual domain tests', () => {
  const obs24 = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'observatory_24');
  assert.equal(obs24.length, 24);
  // Progressive difficulty ordering check: first item is Standard and last item is Advanced/Apex
  assert.equal(obs24[0].difficulty, 'Standard');
  assert.ok(obs24[obs24.length - 1].points >= obs24[0].points);

  const comp18 = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'comprehensive_18');
  assert.equal(comp18.length, 18);

  const quick9 = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'gardner_9_quick');
  assert.equal(quick9.length, 9);

  const matrices16 = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'matrices_16');
  assert.equal(matrices16.length, 16);
  assert.ok(matrices16.every((q) => q.questionFormat === 'matrix_3x3'));

  // Verify each of the 9 individual psychometric tests
  for (const intel of GARDNER_INTELLIGENCES) {
    const domainTest = sampleRandomizedIQQuestions(
      MASTER_IQ_QUESTION_DATABASE,
      `domain_${intel.id}`
    );
    assert.equal(domainTest.length, 7);
    assert.ok(domainTest.every((q) => q.gardnerDomain === intel.id));
  }
});

test('sampleRandomizedIQQuestions avoids repeating excluded question IDs across consecutive draws', () => {
  const draw1 = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'comprehensive_18', []);
  const draw1Ids = draw1.map((q) => q.id);
  const draw2 = sampleRandomizedIQQuestions(
    MASTER_IQ_QUESTION_DATABASE,
    'comprehensive_18',
    draw1Ids
  );
  const draw2Ids = new Set(draw2.map((q) => q.id));
  const overlap = draw1Ids.filter((id) => draw2Ids.has(id));
  assert.equal(
    overlap.length,
    0,
    `Expected 0 overlapping questions between consecutive 18-item draws, found ${overlap.length}`
  );
});

test('computeMultipleIntelligencesProfile calculates accurate composite IQ and 9-domain breakdown', () => {
  const sample = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'gardner_9_quick');
  const allCorrectAnswers: Record<string, number> = {};
  for (const q of sample) {
    allCorrectAnswers[q.id] = q.correctIndex;
  }

  const profile = computeMultipleIntelligencesProfile(sample, allCorrectAnswers, 120);
  assert.equal(profile.answeredCount, 9);
  assert.equal(profile.correctCount, 9);
  assert.equal(profile.accuracyRatio, 1);
  assert.ok(profile.estimatedIq >= 156);
  assert.equal(profile.domainScores.length, 9);
  assert.ok(profile.domainScores.every((d) => d.percent === 100));
});

test('buildPostTestTelemetryReport & buildCalibrationPreviewTelemetryReport compute Headline CI, 4 Sub-Domains, Q1-Q24 Latency Curve, and 4 Difficulty Brackets', () => {
  const obs24 = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'observatory_24');
  const previewReport = buildCalibrationPreviewTelemetryReport(obs24);
  assert.equal(previewReport.totalQuestions, 24);
  assert.equal(previewReport.latencyCurve.length, 24);
  assert.equal(previewReport.latencyCurve[0].label, 'Q1');
  assert.equal(previewReport.latencyCurve[23].label, 'Q24');
  assert.ok(previewReport.latencyCurve[0].questionPrompt.length > 5);
  assert.ok(previewReport.latencyCurve[0].correctOptionText.length > 0);
  assert.equal(previewReport.standardDeviation, 15);
  assert.ok(previewReport.confidenceIntervalLabel.includes('±'));
  assert.equal(previewReport.cognitiveSubDomains.length, 4);
  assert.equal(previewReport.difficultyBrackets.length, 4);
  assert.ok(previewReport.secondHalfAvgLatencyMs > previewReport.firstHalfAvgLatencyMs);

  const sample = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'comprehensive_18');
  const answers: Record<string, number> = {};
  const timings: Record<string, number> = {};
  sample.forEach((q, idx) => {
    // Answer 15/18 right
    answers[q.id] = idx < 15 ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
    timings[q.id] = 3500 + idx * 150;
  });

  const report = buildPostTestTelemetryReport(sample, answers, 90, timings);
  assert.equal(report.standardDeviation, 15);
  assert.ok(report.confidenceIntervalLabel.includes('±'));
  assert.equal(report.cognitiveSubDomains.length, 4);
  assert.equal(report.difficultyBrackets.length, 4);
  assert.equal(report.latencyCurve.length, 18);
  assert.equal(report.correctCount, 15);
  assert.ok(report.percentileRank > 80);
  assert.equal(normalCdfPercentile(100), 50);
});

test('computeGrowthAnalyticsSummaries & appendReportToGrowthHistory track 9-domain longitudinal trajectories and focus share shifts', () => {
  const summaries = computeGrowthAnalyticsSummaries(SEED_GROWTH_HISTORY);
  assert.equal(summaries.length, 9);
  assert.ok(summaries.every((s) => s.latestScore >= s.baselineScore));
  const totalShare = summaries.reduce((acc, s) => acc + s.focusSharePercent, 0);
  assert.ok(totalShare >= 99.5 && totalShare <= 100.5);

  const sample = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, 'gardner_9_quick');
  const answers: Record<string, number> = {};
  sample.forEach((q) => {
    answers[q.id] = q.correctIndex;
  });
  const report = buildPostTestTelemetryReport(sample, answers, 60);
  const nextHistory = appendReportToGrowthHistory(
    SEED_GROWTH_HISTORY,
    report,
    'gardner_9_quick'
  );
  assert.equal(nextHistory.length, SEED_GROWTH_HISTORY.length + 1);
  assert.equal(
    nextHistory[nextHistory.length - 1].compositeIq,
    report.estimatedIq
  );
});


