import { resolve } from "path";
import { inject, injectable } from "tsyringe";
import { v4 as uuidV4 } from "uuid";

import { IUsersRepository } from "@modules/accounts/repositories/IUsersRepository";
import { IUserTokensRepository } from "@modules/accounts/repositories/IUserTokensRepository";
import { IDateProvider } from "@shared/container/providers/DateProvider/IDateProvider";
import { IMailProvider } from "@shared/container/providers/MailProvider/IMailProvider";
import { AppError } from "@shared/errors/AppError";

@injectable()
class SendForgotPasswordMailUseCase {
    constructor(
        @inject("UsersRepository")
        private usersRepository: IUsersRepository,
        @inject("UserTokensRepository")
        private userTokensRepository: IUserTokensRepository,
        @inject("DayjsDateProvider")
        private dayjsDateProvider: IDateProvider,
        @inject("EtherealMailProvider")
        private mailProvider: IMailProvider,
    ) {}

    async execute(email: string): Promise<void> {
        const user = await this.usersRepository.findByEmail(email);

        const templatePath = resolve(
            __dirname,
            "..",
            "..",
            "views",
            "emails",
            "forgotPassword.hbs",
        );

        if (!user) {
            throw new AppError("User does not exists!");
        }

        const token = uuidV4();

        const expires_date = this.dayjsDateProvider.addHours(3);

        await this.userTokensRepository.create({
            refresh_token: token,
            user_id: user.id,
            expires_date,
        });

        const variables = {
            name: user.name,
            link: `${process.env.FORGOT_MAIL_URL}${token}`,
        };

        await this.mailProvider.sendMail(
            email,
            "Recuperação de senha",
            variables,
            templatePath,
        );
    }
}

export { SendForgotPasswordMailUseCase };
