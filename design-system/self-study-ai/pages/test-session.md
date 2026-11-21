# Test session

Take a test at `/tests/session/?id=`.

## Layout

- FullscreenGate when config focus_mode is true
- Countdown from server time_limit_s (advisory)
- IntegrityBanner on focus loss; EventTimeline optional sidebar
- Question navigation (free vs linear from config)
- OptionList / AnswerEditor for answers; block copy/paste in focus mode
- Submit test when complete
- Loading, error, expired states

## Honesty

Copy states browser logs integrity events but cannot prevent cheating.