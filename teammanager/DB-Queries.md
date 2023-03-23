# Helpful database queries

### Count officials per team

    SELECT t.description, t.id, COUNT(t.id) FROM `officials_officiallicensehistory` AS olh JOIN officials_official as o on olh.official_id = o.id JOIN teammanager_team as t on o.team_id = t.id WHERE year(created_at) = 2023 GROUP BY t.id HAVING COUNT(t.id) > 1;
