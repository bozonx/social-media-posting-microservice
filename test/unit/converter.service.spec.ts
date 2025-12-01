import { Test, TestingModule } from '@nestjs/testing';
import { ConverterService } from '../../src/modules/converter/converter.service';
import { AppConfigService } from '../../src/modules/app-config/app-config.service';
import { BodyFormat } from '../../src/common/enums';

describe('ConverterService', () => {
    let service: ConverterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConverterService,
                {
                    provide: AppConfigService,
                    useValue: {
                        getConversionConfig: jest.fn().mockReturnValue({
                            preserveLinks: true,
                            stripHtml: false,
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<ConverterService>(ConverterService);
        await service.onModuleInit();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should convert markdown to html using marked', () => {
        const markdown = '# Hello';
        const html = service.convert(markdown, BodyFormat.MARKDOWN, BodyFormat.HTML);
        // marked adds newline at the end usually
        expect(html).toContain('<h1>Hello</h1>');
    });
});
