import { apiGet } from '../actions/utils/api';
import {apiTeam, apiTokens, apiGames, apiGamedays, apiUsernames } from './types';


export const getGames = async (token:string) => {

    Promise.all([
    apiGet('/api/passcheck/games/list/'),
    apiGet('/api/passcheck/officials/auth/'),
    apiGet('/api/passcheck/usernames/'),
    apiGet('/api/passcheck/gameday/teams/'),
    apiGet('/api/passcheck/gamedays/list')
])
    .then(([games, officialsTokens, usernames, teams, gamedays]) => {
        //console.log('games:', games);

        const getAuthID = (token: string) => {
            const authIDFound = officialsTokens.find((item: apiTokens) => item.token_key === token);
            return authIDFound ? authIDFound.user_id : null;
        }
        const authID = getAuthID(token);
        //console.log('authID:', authID);

        const getUsername = (authID: number) => {
            const usernameFound = usernames.find((item: apiUsernames) => item.id === authID);
            return usernameFound ? usernameFound.username : null;
        }
        const username = getUsername(authID);
        //console.log('username:', username);

        const getOfficialsID = (username: string) => {
            const officialsIDFound = teams.find((item: apiTeam) => item.name === username);
            return officialsIDFound ? officialsIDFound.id : null;
        }
        const officialsID = getOfficialsID(username);
        //console.log('officialsID:', officialsID);

        const getOfficiatingGames = (officialsID: number) => {
            const officiatingGamesFound = games.filter((item: apiGames) => item.officials === officialsID);
            return officiatingGamesFound ? officiatingGamesFound : null;
        }
        const officiatingGames = getOfficiatingGames(officialsID);
        //console.log('games:', officiatingGames);
        return officiatingGames;
    })


//     const games =  await apiGet(
//     `/api/passcheck/games/list/`
//     );
//
//     const officialsTokens = await apiGet(
//     `/api/passcheck/officials/auth/`
//     );
//
//     const teams = await apiGet(
//     `/api/passcheck/gameday/teams/`
//     );
//
//     const gamedays = await apiGet(
//     `/api/passcheck/gamedays/list`
//     );
//
//     return games;



};
//
// export const getOfficials = async () => {
//     const officialsTokens = await apiGet(
//     `/api/passcheck/officials/auth/`
//     );
//
//     return officialsTokens;
// };
//
// export const getTeams = async () => {
//     const teams = await apiGet(
//     `/api/passcheck/gameday/teams/`
//     );
//
//     return teams;
// };
//
// export const getGamedays = async () => {
//     const gamedays = await apiGet(
//     `/api/passcheck/gamedays/list`
//     );
//
//     return gamedays;
// };


