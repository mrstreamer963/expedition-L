Конфигурация opencode хранится в ~/.config/opencode


opencode.json:

```
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}
```

Но opencode сам по своему усмотрению будет их запускать. Чтобы указывать явно - придется его попросить - "хочу запускать skills supepowers через слеш" - он нагенерит
папку `commands` где буду перечислены файлы с именами skill superpowers