import { apiGet } from '../actions/utils/api';
import {apiTeam, apiTokens, apiGames, apiGamedays, apiUsernames } from './types';


export const getGames = async (token:string) => {

        const data = await apiGet(
            `/api/passcheck/${token}/`
        );
        console.log('data:', data);
        return data;
};
