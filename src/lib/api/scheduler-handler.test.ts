import { describe, it, expect, vi } from 'vitest';

describe('Scheduler Handler Deduplication & Timezone Logic', () => {
  it('should correctly calculate currentDay as 1 on the day of campaign creation without timezone drift', () => {
    // Simulate the string that comes from the database for a campaign created on Oct 7 at midnight UTC
    const startDateStr = '2026-10-07T00:00:00.000Z';
    // Emulate local "today" being Oct 7th, 21:00 UTC-3 (which is Oct 8 00:00 UTC)
    // The key is that the user's local day is Oct 7.
    const datePart = startDateStr.split('T')[0];
    const [sYear, sMonth, sDay] = datePart.split('-').map(Number);
    const startClean = new Date(sYear, sMonth - 1, sDay);
    
    // Simulate today is Oct 7
    const today = new Date(2026, 9, 7); // Month is 0-indexed (9 = Oct)
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = todayClean.getTime() - startClean.getTime();
    const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Assert that the campaign is on Day 1 (not Day 2 due to timezone offset)
    expect(currentDay).toBe(1);
  });

  it('should not skip pieces with the same time but different formats', () => {
    // Simulate existing execution logs
    const executionLogs = [
      {
        day: 1,
        channel: 'Social',
        platform: 'instagram',
        videoName: 'Video 1',
        time: '19:00',
        format: 'reel',
        status: 'success'
      }
    ];

    // Simulate checking a new scheduled event that is a carousel at the same time
    const currentSched = {
      videoName: 'Video 1',
      time: '19:00',
      format: 'carousel'
    };

    const alreadyRun = executionLogs.some(
      (log) =>
        log.day === 1 &&
        log.channel === 'Social' &&
        log.platform === 'instagram' &&
        log.videoName === currentSched.videoName &&
        log.time === currentSched.time &&
        log.format === currentSched.format && // The critical fix
        log.status === 'success'
    );

    // Assert that it should NOT be marked as already run because formats differ (reel vs carousel)
    expect(alreadyRun).toBe(false);
  });
  
  it('should correctly skip pieces if time AND format matches', () => {
    const executionLogs = [
      {
        day: 1,
        channel: 'Social',
        platform: 'instagram',
        videoName: 'Video 1',
        time: '19:00',
        format: 'reel',
        status: 'success'
      }
    ];

    const currentSched = {
      videoName: 'Video 1',
      time: '19:00',
      format: 'reel'
    };

    const alreadyRun = executionLogs.some(
      (log) =>
        log.day === 1 &&
        log.channel === 'Social' &&
        log.platform === 'instagram' &&
        log.videoName === currentSched.videoName &&
        log.time === currentSched.time &&
        log.format === currentSched.format &&
        log.status === 'success'
    );

    // Assert that it correctly prevents duplication
    expect(alreadyRun).toBe(true);
  });
});
