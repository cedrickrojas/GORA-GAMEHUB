import { db, transaction } from './db.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { config } from '../config/env.js';
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;
const photos = {
  basketball: image('photo-1546519638-68e109498ffc'),
  football: image('photo-1574629810360-7efbbe195018'),
  volleyball: image('photo-1592656094267-764a45160876'),
  tennis: image('photo-1595435934249-5df7ed86e1c0'),
  badminton: image('photo-1622279457486-62dcc4a431d6'),
  boxing: image('photo-1549719386-74dfcbf7dbed'),
  running: image('photo-1538805060514-97d9cc17730c'),
  watch: image('photo-1461896836934-ffe607ba8211'),
};
export async function seed() {
  if (config.production) throw new Error('Demo seed is disabled in production.');
  if ((await db.query("SELECT 1 FROM users WHERE username='alexreyes'")).rows.length) return;
  const password = process.env.DEMO_PASSWORD || randomBytes(24).toString('base64url');
  const hash = await bcrypt.hash(password, 12);
  await transaction(async (tx) => {
    const names = [
      'Basketball',
      'Football',
      'Volleyball',
      'Baseball',
      'Tennis',
      'Badminton',
      'Boxing',
      'MMA',
      'Futsal',
      'Esports',
      'Formula 1',
      'UFC',
      'Other',
    ];
    const sportIds: Record<string, string> = {};
    for (const name of names) {
      const key = name.toLowerCase();
      const s = (
        await tx.query(
          'INSERT INTO sports(name,slug,icon,description,image_url) VALUES($1,$2,$3,$4,$5) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
          [
            name,
            key.replace(/ /g, '-'),
            key === 'basketball'
              ? 'basketball'
              : key === 'football'
                ? 'football'
                : key === 'tennis'
                  ? 'tennisball'
                  : key === 'volleyball'
                    ? 'volleyball'
                    : key === 'baseball'
                      ? 'baseball'
                      : key === 'esports'
                        ? 'game-controller'
                        : 'fitness',
            `Find your ${name.toLowerCase()} crew. Local games, watch parties, and communities.`,
            photos[key as keyof typeof photos] || photos.basketball,
          ],
        )
      ).rows[0];
      sportIds[name] = s.id;
    }
    const people = [
      {
        name: 'Alex Reyes',
        username: 'alexreyes',
        bio: 'Weekend hooper. Lakers fan. Always down for a good game and even better company.',
        location: 'Makati, Manila',
        team: 'LA Lakers',
        sports: ['Basketball', 'Football', 'Tennis'],
        avatar: 'photo-1500648767791-00dcc994a43e',
      },
      {
        name: 'Marco Santos',
        username: 'marcosantos',
        bio: 'Lakers all the way. Looking for a crew to catch the next game with.',
        location: 'Makati, Manila',
        team: 'LA Lakers',
        sports: ['Basketball', 'Boxing'],
        avatar: 'photo-1506794778202-cad84cf45f1d',
      },
      {
        name: 'Jake Villanueva',
        username: 'jakev',
        bio: 'Football, good friends, and a cold drink. United through and through.',
        location: 'BGC, Manila',
        team: 'Manchester United',
        sports: ['Football', 'Futsal'],
        avatar: 'photo-1519085360753-af0119f7cbe7',
      },
      {
        name: 'Chris Mendoza',
        username: 'chrism',
        bio: 'Weekend warrior. Up for a tennis doubles match or the next F1 watch party.',
        location: 'Makati, Manila',
        team: 'Ferrari',
        sports: ['Tennis', 'Formula 1', 'Basketball'],
        avatar: 'photo-1535713875002-d1d0cf377fde',
      },
      {
        name: 'Daniel Cruz',
        username: 'danielcruz',
        bio: 'Building a community, one pickup game at a time. Everyone is welcome.',
        location: 'Muntinlupa, Manila',
        team: 'Golden State Warriors',
        sports: ['Basketball', 'Volleyball'],
        avatar: 'photo-1507003211169-0a1dd7228f2d',
      },
      {
        name: 'Sofia Garcia',
        username: 'sofiag',
        bio: 'Competitive on the court, easygoing off it. See you at the next volleyball session.',
        location: 'Taguig, Manila',
        team: 'Creamline',
        sports: ['Volleyball', 'Badminton'],
        avatar: 'photo-1534528741775-53994a69daeb',
      },
      {
        name: 'Rafael Lim',
        username: 'rafaellim',
        bio: 'Badminton after work. Let’s get a rally going.',
        location: 'Pasig, Manila',
        team: 'Team Philippines',
        sports: ['Badminton', 'Tennis'],
        avatar: 'photo-1507591064344-4c6ce005b128',
      },
      {
        name: 'Miguel Torres',
        username: 'miguelt',
        bio: 'F1 Sundays and basketball weekdays. Find me where the action is.',
        location: 'Quezon City, Manila',
        team: 'McLaren',
        sports: ['Formula 1', 'Basketball', 'MMA'],
        avatar: 'photo-1472099645785-5658abf4ff4e',
      },
      {
        name: 'Adrian Flores',
        username: 'adrianf',
        bio: 'Here for the game and the people.',
        location: 'Makati, Manila',
        team: 'LA Lakers',
        sports: ['Basketball', 'Football'],
        avatar: 'photo-1521119989659-a83eee488004',
      },
      {
        name: 'Nico Ramos',
        username: 'nicor',
        bio: 'Catch a game. Make a friend. Repeat.',
        location: 'Manila',
        team: 'Boston Celtics',
        sports: ['Basketball', 'Esports'],
        avatar: 'photo-1504257432389-52343af06ae3',
      },
      {
        name: 'Ben Castillo',
        username: 'benc',
        bio: 'Tennis doubles and weekend watch parties.',
        location: 'Manila',
        team: 'Rafael Nadal',
        sports: ['Tennis', 'Football'],
        avatar: 'photo-1517841905240-472988babdf9',
      },
      {
        name: 'Luis Tan',
        username: 'luistan',
        bio: 'The best games happen with a great crew.',
        location: 'Manila',
        team: 'LA Lakers',
        sports: ['Basketball', 'Volleyball'],
        avatar: 'photo-1519345182560-3f2917c472ef',
      },
    ];
    const users: string[] = [];
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const u = (
        await tx.query(
          'INSERT INTO users(email,username,full_name,password_hash,date_of_birth,role) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
          [
            p.username + '@gora.example',
            p.username,
            p.name,
            hash,
            `199${i % 8}-05-15`,
            i === 0 && process.env.SEED_ADMIN === 'true' ? 'admin' : 'user',
          ],
        )
      ).rows[0];
      users.push(u.id);
      await tx.query(
        'INSERT INTO profiles(user_id,bio,location,avatar_url,favorite_team,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          u.id,
          p.bio,
          p.location,
          image(p.avatar),
          p.team,
          14.5547 + i * 0.005,
          121.0244 + i * 0.006,
        ],
      );
      for (const s of p.sports)
        await tx.query('INSERT INTO user_sports(user_id,sport_id) VALUES($1,$2)', [
          u.id,
          sportIds[s],
        ]);
    }
    const date = (days: number, hour: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      d.setUTCHours(hour - 8, 0, 0, 0);
      return d.toISOString();
    };
    const games = [
      [
        'Sunday Basketball Run',
        'Basketball',
        4,
        16,
        19,
        'Muntinlupa, Manila',
        'Muntinlupa Sports Complex',
        12,
        8,
        'Play a Game',
        'Intermediate',
        4,
        photos.basketball,
      ],
      [
        'Lakers vs. Warriors Watch Party',
        'Basketball',
        1,
        19,
        22,
        'Makati, Manila',
        'The Draft, Greenbelt',
        12,
        7,
        'Watch a Game',
        'Any',
        1,
        photos.watch,
      ],
      [
        'Friday Night Football',
        'Football',
        2,
        19,
        21,
        'BGC, Manila',
        'BGC Turf, Taguig',
        14,
        10,
        'Casual Match',
        'Any',
        2,
        photos.football,
      ],
      [
        'Smash & Rally: Badminton',
        'Badminton',
        3,
        17,
        19,
        'Pasig, Manila',
        'The Upper Deck',
        8,
        5,
        'Play a Game',
        'Beginner',
        6,
        photos.badminton,
      ],
      [
        'Sunset Volleyball Crew',
        'Volleyball',
        3,
        16,
        18,
        'Taguig, Manila',
        'BGC Community Court',
        12,
        9,
        'Play a Game',
        'Any',
        5,
        photos.volleyball,
      ],
      [
        'Weekend Tennis Doubles',
        'Tennis',
        4,
        8,
        10,
        'Makati, Manila',
        'Makati Sports Club',
        8,
        4,
        'Practice',
        'Intermediate',
        3,
        photos.tennis,
      ],
      [
        'Formula 1: Race Night',
        'Formula 1',
        4,
        20,
        23,
        'Makati, Manila',
        'The Grid Sports Bar',
        20,
        8,
        'Watch a Game',
        'Any',
        7,
        photos.watch,
      ],
      [
        'Morning Hoops at BGC',
        'Basketball',
        5,
        7,
        9,
        'BGC, Manila',
        'Titan Love Court',
        10,
        6,
        'Casual Match',
        'Any',
        4,
        photos.basketball,
      ],
      [
        'Last Week’s Pickup Run',
        'Basketball',
        -7,
        16,
        18,
        'Makati, Manila',
        'Circuit Makati',
        12,
        8,
        'Play a Game',
        'Any',
        0,
        photos.basketball,
      ],
    ] as const;
    const eventIds: string[] = [];
    for (let i = 0; i < games.length; i++) {
      const [title, sport, days, start, end, location, venue, max, count, type, skill, host, img] =
        games[i];
      const v = (
        await tx.query(
          'INSERT INTO venues(name,location) VALUES($1,$2) ON CONFLICT(name,location) DO UPDATE SET name=EXCLUDED.name RETURNING id',
          [venue, location],
        )
      ).rows[0];
      const e = (
        await tx.query(
          'INSERT INTO events(host_id,sport_id,venue_id,title,description,starts_at,ends_at,location,venue,max_participants,required_participants,type,skill_level,image_url,featured,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id',
          [
            users[host],
            sportIds[sport],
            v.id,
            title,
            `Good games. Great people. Join our ${sport.toLowerCase()} crew for ${type === 'Watch a Game' ? 'an evening of big plays and good company' : 'a friendly session with the local community'}. Bring your energy${type === 'Watch a Game' ? ' and your team spirit' : ', water, and your gear'}. All are welcome — arrive 15 minutes early to meet the crew.`,
            date(days, start),
            date(days, end),
            location,
            venue,
            max,
            2,
            type,
            skill,
            img,
            i === 0,
            14.55,
            121.03,
          ],
        )
      ).rows[0];
      eventIds.push(e.id);
      const members = [
        users[host],
        ...users.filter((u, j) => u !== users[host] && (i === 8 || j !== 0)),
      ].slice(0, count);
      if (i === 5 && !members.includes(users[0])) members[1] = users[0];
      const c = (
        await tx.query('INSERT INTO conversations(event_id,title) VALUES($1,$2) RETURNING id', [
          e.id,
          'GORA ' + sport + ' — ' + title,
        ])
      ).rows[0];
      for (const u of members) {
        await tx.query('INSERT INTO event_participants(event_id,user_id) VALUES($1,$2)', [e.id, u]);
        await tx.query('INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2)', [
          c.id,
          u,
        ]);
      }
      await tx.query('INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3)', [
        c.id,
        users[host],
        'Hey crew! Excited to see everyone. Let’s arrive 15 minutes early.',
      ]);
    }
    for (let i = 1; i < 7; i++)
      await tx.query('INSERT INTO followers(follower_id,following_id) VALUES($1,$2)', [
        users[i],
        users[0],
      ]);
    for (let i = 1; i < 4; i++)
      await tx.query(
        "INSERT INTO friendships(requester_id,addressee_id,status) VALUES($1,$2,'accepted')",
        [users[0], users[i]],
      );
    const direct = (
      await tx.query('INSERT INTO conversations(title,direct_key) VALUES($1,$2) RETURNING id', [
        'Marco Santos',
        [users[0], users[1]].sort().join(':'),
      ])
    ).rows[0];
    for (const u of [users[0], users[1]])
      await tx.query('INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2)', [
        direct.id,
        u,
      ]);
    await tx.query('INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3)', [
      direct.id,
      users[1],
      'Hey Alex! Catching the Lakers game tomorrow? We’ve got room for a couple more. 🏀',
    ]);
    for (const [name, sport, location, img] of [
      ['Manila Hoops Collective', 'Basketball', 'Metro Manila', photos.basketball],
      ['The Football Social', 'Football', 'BGC, Taguig', photos.football],
      ['Rally Club Manila', 'Tennis', 'Makati', photos.tennis],
    ] as const) {
      const c = (
        await tx.query(
          'INSERT INTO communities(sport_id,name,description,location,image_url) VALUES($1,$2,$3,$4,$5) RETURNING id',
          [
            sportIds[sport],
            name,
            'Your next game starts with a great community. Meet the crew and join a local session.',
            location,
            img,
          ],
        )
      ).rows[0];
      for (const u of users.slice(1, 10))
        await tx.query('INSERT INTO community_members(community_id,user_id) VALUES($1,$2)', [
          c.id,
          u,
        ]);
    }
    await tx.query(
      'INSERT INTO notifications(user_id,actor_id,type,title,link,event_id) VALUES($1,$2,$3,$4,$5,$6)',
      [
        users[0],
        users[1],
        'invitation',
        'Marco invited you to Lakers vs. Warriors',
        '/event/' + eventIds[1],
        eventIds[1],
      ],
    );
    await tx.query(
      'INSERT INTO event_invitations(event_id,inviter_id,invitee_id) VALUES($1,$2,$3)',
      [eventIds[1], users[1], users[0]],
    );
    await tx.query(
      'INSERT INTO system_settings(key,value) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',
      [
        'community_guidelines',
        JSON.stringify('Play fair. Respect the crew. Keep it inclusive. Show up on time.'),
      ],
    );
  });
  console.log('Development data seeded. Use “Explore demo” to sign in locally.');
}
