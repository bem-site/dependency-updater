# dependency-updater
Инструмент для автоматического обновления npm зависимости в использующих ее приложениях
после публикации новой версии этой зависимости в npm реестр.

[![Coveralls branch](https://img.shields.io/coveralls/bem-site/dependency-updater/master.svg)](https://coveralls.io/r/bem-site/dependency-updater?branch=master)
[![Travis](https://img.shields.io/travis/bem-site/dependency-updater.svg)](https://travis-ci.org/bem-site/dependency-updater)
[![David](https://img.shields.io/david/bem-site/dependency-updater.svg)](https://david-dm.org/bem-site/dependency-updater)
[![David](https://img.shields.io/david/dev/bem-site/dependency-updater.svg)](https://david-dm.org/bem-site/dependency-updater#info=devDependencies)

![GitHub Logo](./logo.png)

## Установка

* склонировать репозиторий: `$ git clone https://github.com/bem-site/dependency-updater.git`
* установить npm зависимости: `$ npm install`
* сгенерировать конфигурационный файл: `$ npm run config`

## Конфигурация

Вся доступная конфигурация проекта находится в файле: `config/_config.json`

* `appFolders` - пути к директориям приложений в которых нужно обновить зависимость
* `updateScript` - скрипт который нужно выполнить чтобы обновить зависимость, например: `npm update {название пакета}`.
Примечание: допускается использование переменной `{app}` внутри команды. `{app}` - будет заменен,
на название директории в текущего приложения (не включая родительские директории).  
* `dependencyName` - название зависимости. Имя npm пакета, например: "express", "lodash" и.т.д.
* `cron` - объект, который позволяет настроить расписание выполнения очистки данных.
Более детально об этой опции можно прочитать [здесь](https://github.com/bem-site/cron-runner/blob/master/README.ru.md)
* `logger` - настройки логгирования инструмента. Для логгирования используется
иструмент [логгер](https://github.com/bem-site/logger). Более детально про его настройку можно прочитать
в [документации](https://github.com/bem-site/logger/blob/master/README.ru.md) к этому инструменту

## Тестирование

Запуск тестов:
```
npm test
```

Проверка синткасиса кода с помощью jshint и jscs
```
npm run codestyle
```

Особая благодарность за помощь в разработке:

* Ильченко Николай (http://github.com/tavriaforever)
* Константинова Гела (http://github.com/gela-d)

Разработчик Кузнецов Андрей Серргеевич @tormozz48
Вопросы и предложения присылать по адресу: tormozz48@gmail.com
