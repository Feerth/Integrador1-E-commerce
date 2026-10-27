package com.skyairline.config; // ajusta al paquete real

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/** Lee la configuración de Mongo desde variables de entorno o config.properties (nunca fija en el código). */
public final class AppConfig {
    private static final Properties P = new Properties();
    static {
        Path f = Path.of("config.properties");
        if (Files.exists(f)) {
            try (InputStream in = Files.newInputStream(f)) { P.load(in); } catch (IOException ignored) { }
        }
    }
    private AppConfig() { }

    public static String mongoUri() { return get("MONGO_URI", "mongo.uri", "mongodb://localhost:27017"); }
    public static String mongoDb()  { return get("MONGO_DB", "mongo.db", "skyairline"); }

    private static String get(String env, String prop, String def) {
        String v = System.getenv(env);
        return (v != null && !v.isBlank()) ? v : P.getProperty(prop, def);
    }
}
