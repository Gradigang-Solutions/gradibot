import { StringOption } from 'necord';

export class PlayDto {
  @StringOption({
    name: 'query',
    description: 'Song name or YouTube URL',
    required: true,
  })
  query!: string;
}
