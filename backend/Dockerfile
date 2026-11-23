FROM maven:4.0.0-rc-5-eclipse-temurin-21-noble AS build

WORKDIR /app

ENV MAVEN_OPTS="-Xmx512m"

COPY pom.xml .

RUN mvn -q dependency:go-offline

COPY src ./src

RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/budgie-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]