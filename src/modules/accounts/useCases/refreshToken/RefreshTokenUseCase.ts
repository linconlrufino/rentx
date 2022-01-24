import { sign, verify } from "jsonwebtoken";
import { inject } from "tsyringe";

import auth from "@config/auth";
import { IUserTokensRepository } from "@modules/accounts/repositories/IUserTokensRepository";
import { IDateProvider } from "@shared/container/providers/DateProvider/IDateProvider";
import { AppError } from "@shared/errors/AppError";

interface IPayload {
    sub: string;
    email: string;
}

class RefreshTokenUseCase {
    constructor(
        @inject("UserTokensRepository")
        private userTokensRepository: IUserTokensRepository,
        @inject("DayjsDateProvider")
        private dateProvider: IDateProvider,
    ) {}

    async execute(token: string): Promise<string> {
        const { sub, email } = verify(
            token,
            auth.secret_refresh_token,
        ) as IPayload;

        const user_id = sub;

        const userToken =
            await this.userTokensRepository.findByUserIdAndRefreshToken(
                user_id,
                token,
            );

        if (!userToken) {
            throw new AppError("Refresh Token does not exists!");
        }

        await this.userTokensRepository.deleteById(userToken.id);

        const refresh_token = sign({ email }, auth.secret_refresh_token, {
            subject: sub,
            expiresIn: auth.expires_in_refresh_token,
        });

        const expires_date = this.dateProvider.addDays(
            auth.expires_refresh_token_days,
        );

        await this.userTokensRepository.create({
            user_id,
            expires_date,
            refresh_token,
        });

        return refresh_token;
    }
}

export { RefreshTokenUseCase };
