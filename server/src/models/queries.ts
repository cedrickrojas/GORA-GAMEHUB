export const profileSelect = `SELECT u.id,u.full_name,u.username,u.role,u.created_at,p.bio,p.location,p.avatar_url,p.favorite_team,p.available_seats,p.group_size,p.latitude,p.longitude,
 EXTRACT(YEAR FROM age(u.date_of_birth))::int AS age,
 COALESCE((SELECT json_agg(s.name) FROM user_sports us JOIN sports s ON s.id=us.sport_id WHERE us.user_id=u.id),'[]') AS favorite_sports,
 (SELECT count(*)::int FROM event_participants ep WHERE ep.user_id=u.id AND ep.status='approved') AS games_joined,
 (SELECT count(*)::int FROM events e WHERE e.host_id=u.id) AS games_created,
 (SELECT count(*)::int FROM followers f WHERE f.following_id=u.id) AS followers,
 (SELECT count(*)::int FROM followers f WHERE f.follower_id=u.id) AS following,
 (SELECT count(*)::int FROM friendships f WHERE (f.requester_id=u.id OR f.addressee_id=u.id) AND f.status='accepted') AS friends
 FROM users u JOIN profiles p ON p.user_id=u.id`;
export const eventSelect = `SELECT e.*,s.name AS sport,s.icon AS sport_icon,u.full_name AS host_name,u.username AS host_username,p.avatar_url AS host_avatar,
 (SELECT count(*)::int FROM event_participants ep WHERE ep.event_id=e.id AND ep.status='approved') AS participants,
 COALESCE((SELECT json_agg(json_build_object('id',pu.id,'name',pu.full_name,'avatar_url',pp.avatar_url)) FROM (SELECT * FROM event_participants WHERE event_id=e.id AND status='approved' ORDER BY created_at LIMIT 4) ep JOIN users pu ON pu.id=ep.user_id JOIN profiles pp ON pp.user_id=pu.id),'[]') AS avatars
 FROM events e JOIN sports s ON s.id=e.sport_id JOIN users u ON u.id=e.host_id JOIN profiles p ON p.user_id=u.id`;
export const visibility = `(e.privacy='Public' OR e.host_id=$1 OR EXISTS(SELECT 1 FROM event_participants ep WHERE ep.event_id=e.id AND ep.user_id=$1) OR EXISTS(SELECT 1 FROM event_invitations i WHERE i.event_id=e.id AND i.invitee_id=$1 AND i.status <> 'declined') OR (e.privacy='Friends' AND EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.requester_id=e.host_id AND f.addressee_id=$1) OR (f.addressee_id=e.host_id AND f.requester_id=$1)))))`;
