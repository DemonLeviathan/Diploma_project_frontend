#указываем образ который хотим использовать чтобы запустилось наше приложение в контейнере
FROM node:15.13-alpine 
# создаёт и задаёт рабочую папку в app контейнере
WORKDIR /app
#копируем текущее содержимое дериктоии в папку app
COPY . .
#Выполняем сборку проекта
RUN npm run build
#Запускаем проект в контейнере
CMD ["npm", "start"]