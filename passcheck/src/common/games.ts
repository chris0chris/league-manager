import { apiGet, apiPut } from '../actions/utils/api';
import {apiTeam, apiTokens, apiGames, apiGamedays, apiUsernames } from './types';


export const getPasscheckData = async (token:string) => {

        const data = await apiGet(
            `/api/passcheck/${token}/`
        );
        return data;
};

export const getPlayerList = async (team:string) => {

        const players = await apiGet(
            `/api/passcheck/roster/${team}/`
        );
        return players;
}

export const submitRoster = async (team:string, roster:any) => {

        await apiPut(
            `/api/passcheck/roster/${team}/`,
            roster
        );
}