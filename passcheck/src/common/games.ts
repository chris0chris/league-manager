import { apiGet } from '../actions/utils/api';
import {apiTeam, apiTokens, apiGames, apiGamedays, apiUsernames } from './types';


export const getPasscheckData = async (token:string) => {

        const data = await apiGet(
            `/api/passcheck/${token}/`
        );
        return data;
};

export const getPlayerList = async (team:string) => {

        const players = await apiGet(
            `/api/passcheck/players/${team}/`
        );
        return players;
}
