import {
  DEFAULT_ROOM_POLICY,
  HvmMeetRoomPolicy,
  MANAGED_MEET_KEYS,
  MeetAccessMode,
  meetFactorOfMode,
  normalizeLessonMeetPolicy,
  normalizeRoomPolicy,
  resolveSections,
  toMeetSettings,
} from '../hvm-meet.policy'

const withMode = (mode: MeetAccessMode) => ({ access: { ...DEFAULT_ROOM_POLICY.access, mode }, attendance: null })

describe('Chính sách phòng HVM Meet', () => {
  it('DEFAULT_ROOM_POLICY bằng đúng mặc định trong catalog của HVM Meet', () => {
    expect(DEFAULT_ROOM_POLICY).toEqual({
      access: {
        mode: 'account',
        guest_waiting_room: true,
        waiting_room: false,
        join_early_minutes: 15,
        join_cutoff_minutes: 0,
        allow_two_devices: false,
      },
      attendance: {
        enabled: true,
        present_percent: 70,
        late_after_minutes: 10,
        grace_seconds: 120,
        random_check_count: 0,
        check_mode: 'button',
        check_duration_seconds: 60,
        min_checks_percent: 0,
      },
    })
  })

  it('MANAGED_MEET_KEYS: đúng các key meet, không trùng', () => {
    expect(MANAGED_MEET_KEYS).toEqual([
      'room.publicJoin',
      'room.publicJoinFactor',
      'room.guestWaitingRoom',
      'room.waitingRoom',
      'room.joinEarlyMinutes',
      'room.joinCutoffMinutes',
      'room.allowSameIdentityTwice',
      'attendance.enabled',
      'attendance.presentThresholdPercent',
      'attendance.lateAfterMinutes',
      'attendance.gracePeriodSeconds',
      'attendance.check.randomCount',
      'attendance.check.mode',
      'attendance.check.durationSeconds',
      'attendance.minChecksPassedPercent',
    ])
    expect(new Set(MANAGED_MEET_KEYS).size).toBe(MANAGED_MEET_KEYS.length)
  })

  describe('toMeetSettings', () => {
    it.each([
      ['account', false, null],
      ['account_or_code_birthdate', true, 'birthdate'],
      ['account_or_code', true, 'none'],
      ['account_or_guest', true, 'guest'],
    ] as const)('mode %s → publicJoin %s, factor %s', (mode, publicJoin, factor) => {
      const settings = toMeetSettings(withMode(mode))
      expect(settings['room.publicJoin']).toBe(publicJoin)
      expect(settings['room.publicJoinFactor']).toBe(factor)
      expect(meetFactorOfMode(mode)).toBe(factor)
    })

    it('cả hai phần null → đủ mọi key, tất cả null (về giá trị kế thừa của meet)', () => {
      const settings = toMeetSettings({ access: null, attendance: null })
      expect(Object.keys(settings)).toEqual([...MANAGED_MEET_KEYS])
      expect(Object.values(settings).every(value => value === null)).toBe(true)
      expect(toMeetSettings(null)).toEqual(settings)
    })

    it('mặc định → đúng từng giá trị', () => {
      expect(toMeetSettings(DEFAULT_ROOM_POLICY)).toEqual({
        'room.publicJoin': false,
        'room.publicJoinFactor': null,
        'room.guestWaitingRoom': true,
        'room.waitingRoom': false,
        'room.joinEarlyMinutes': 15,
        'room.joinCutoffMinutes': 0,
        'room.allowSameIdentityTwice': false,
        'attendance.enabled': true,
        'attendance.presentThresholdPercent': 70,
        'attendance.lateAfterMinutes': 10,
        'attendance.gracePeriodSeconds': 120,
        'attendance.check.randomCount': 0,
        'attendance.check.mode': 'button',
        'attendance.check.durationSeconds': 60,
        'attendance.minChecksPassedPercent': 0,
      })
    })

    it('chỉ có phần cách vào → key điểm danh null; và ngược lại', () => {
      const accessOnly = toMeetSettings({ access: DEFAULT_ROOM_POLICY.access, attendance: null })
      expect(accessOnly['room.waitingRoom']).toBe(false)
      expect(MANAGED_MEET_KEYS.filter(k => k.startsWith('attendance.')).every(k => accessOnly[k] === null)).toBe(true)

      const attendanceOnly = toMeetSettings({ access: null, attendance: { ...DEFAULT_ROOM_POLICY.attendance, check_mode: 'code' } })
      expect(attendanceOnly['attendance.check.mode']).toBe('code')
      expect(MANAGED_MEET_KEYS.filter(k => k.startsWith('room.')).every(k => attendanceOnly[k] === null)).toBe(true)
    })
  })

  describe('resolveSections: buổi học ?? chung ?? null, từng phần', () => {
    const global: HvmMeetRoomPolicy = {
      access: { ...DEFAULT_ROOM_POLICY.access, mode: 'account_or_code_birthdate' },
      attendance: { ...DEFAULT_ROOM_POLICY.attendance, present_percent: 80 },
    }
    const lessonAccess = { ...DEFAULT_ROOM_POLICY.access, mode: 'account_or_guest' as const }
    const lessonAttendance = { ...DEFAULT_ROOM_POLICY.attendance, random_check_count: 3 }

    it.each([
      ['không có gì', null, null, { access: null, attendance: null }],
      ['chỉ cấu hình chung', global, null, { access: global.access, attendance: global.attendance }],
      ['buổi ghi đè cách vào', global, { access: lessonAccess, attendance: null }, { access: lessonAccess, attendance: global.attendance }],
      ['buổi ghi đè điểm danh (thiếu key access)', global, { attendance: lessonAttendance }, { access: global.access, attendance: lessonAttendance }],
      ['buổi ghi đè cả hai', global, { access: lessonAccess, attendance: lessonAttendance }, { access: lessonAccess, attendance: lessonAttendance }],
      ['chưa có cấu hình chung, buổi ghi đè một phần', null, { access: lessonAccess }, { access: lessonAccess, attendance: null }],
    ])('%s', (_label, g, l, expected) => {
      expect(resolveSections(g as any, l as any)).toEqual(expected)
    })
  })

  describe('chuẩn hoá trước khi lưu', () => {
    it('bỏ trường lạ, giữ đúng các trường', () => {
      const policy = normalizeRoomPolicy({
        access: { ...DEFAULT_ROOM_POLICY.access, hacker: 1 },
        attendance: { ...DEFAULT_ROOM_POLICY.attendance, extra: 'x' },
        other: true,
      })
      expect(policy).toEqual(DEFAULT_ROOM_POLICY)
    })

    it('cấu hình chung thiếu một phần / mode lạ → null (coi như chưa lưu)', () => {
      expect(normalizeRoomPolicy({ access: DEFAULT_ROOM_POLICY.access })).toBeNull()
      expect(normalizeRoomPolicy({ access: { ...DEFAULT_ROOM_POLICY.access, mode: 'open' }, attendance: DEFAULT_ROOM_POLICY.attendance })).toBeNull()
      expect(normalizeRoomPolicy(null)).toBeNull()
      expect(normalizeRoomPolicy('rác')).toBeNull()
    })

    it('ghi đè theo buổi: cả hai phần trống → null; một phần → phần kia null', () => {
      expect(normalizeLessonMeetPolicy({ access: null, attendance: null })).toBeNull()
      expect(normalizeLessonMeetPolicy({})).toBeNull()
      expect(normalizeLessonMeetPolicy(undefined)).toBeNull()
      expect(normalizeLessonMeetPolicy({ attendance: DEFAULT_ROOM_POLICY.attendance })).toEqual({
        access: null,
        attendance: DEFAULT_ROOM_POLICY.attendance,
      })
    })
  })
})
