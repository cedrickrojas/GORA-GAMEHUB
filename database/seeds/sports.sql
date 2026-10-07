INSERT INTO sports(name,slug,icon,description,image_url) VALUES
('Basketball','basketball','basketball','Local runs, watch parties, and your basketball crew.','https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=85'),
('Football','football','football','Find your team and the next football match.','https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85'),
('Volleyball','volleyball','volleyball','Rally together on your local court.','https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1200&q=85'),
('Baseball','baseball','baseball','Connect with your local baseball community.','https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1200&q=85'),
('Tennis','tennis','tennisball','Find a doubles partner or your next rally.','https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=85'),
('Badminton','badminton','fitness','Find friendly rallies and competitive matches.','https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=85'),
('Boxing','boxing','fitness','Train with your crew or catch the next fight.','https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85'),
('MMA','mma','fitness','Meet mixed martial arts enthusiasts.','https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85'),
('Futsal','futsal','football','Small-sided games, big energy.','https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85'),
('Esports','esports','game-controller','Squad up and watch competitive gaming.','https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85'),
('Formula 1','formula-1','flag','Find your race-day watch party.','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85'),
('UFC','ufc','fitness','Your next fight-night crew is waiting.','https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85'),
('Other','other','trophy','Find your game, whatever your sport.','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85')
ON CONFLICT(name) DO NOTHING;
