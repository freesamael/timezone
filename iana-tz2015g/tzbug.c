#include <stdio.h>
#include <stdlib.h>
#include <time.h>

void display_now() {
  char output[80];
  time_t now = 1443657600;
  struct tm *lcltime;

  tzset();
  lcltime = localtime(&now);
  strftime(output, sizeof(output), "%Y-%m-%d %H:%M:%S %z %Z", lcltime);

  printf("%s:\ntzname[0]=%s\ntzname[1]=%s\ntimezone=%ld, daylight=%d\n%s\n\n",
    getenv("TZ"), tzname[0], tzname[1], timezone, daylight, output);
}

int main(int argc, char *argv[]) {
  char *timezones[] = { "Asia/Taipei", "Africa/Tunis", "UTC+05:30", "CET", "UTC", "UTC-12:45", "America/New_York", "Europe/Moscow", "UTC-08:00" };

  int i;
  for (i = 0; i < 9; i++) {
    setenv("TZ", timezones[i], 1);
    display_now();
  }

  return 0;
}
