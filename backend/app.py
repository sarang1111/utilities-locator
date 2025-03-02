from flask import Flask, render_template, request, jsonify
import mysql.connector
from mysql.connector import Error
import geopy.distance
import subprocess

app = Flask(__name__)
initialized = False

def run_creation_script():
    try:
        subprocess.run(['python', 'database_creation.py'], check=True)
        print("Database creation script executed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running database creation script: {e}")

def run_trigger_creation():
    try:
        subprocess.run(['python', 'triggers.py'], check=True)  
        print("Trigger creation script executed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running trigger creation script: {e}")

@app.before_request
def initialize():
    global initialized
    if not initialized:
        run_creation_script()
        run_trigger_creation()
        initialized = True

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Sarang@433',
            database='utilities_locator'
        )
        return conn
    except Error as e:
        print(f"Error: {e}")
        return None

def get_utilities(utility_type, max_distance, user_lat, user_lon):
    conn = get_db_connection()
    utilities = []
    if conn:
        cursor = conn.cursor(dictionary=True)
        
        queries = {
            "atm": """
                SELECT a.name, a.address, l.latitude, l.longitude, a.phone, a.email, a.zip
                FROM atm a
                JOIN location l ON a.address = l.location;
            """,
            "mall": """
                SELECT m.mall_name AS name, m.address, l.latitude, l.longitude
                FROM malls m
                JOIN location l ON m.address = l.location;
            """,
            "metro_station": """
                SELECT ms.station_name AS name, ms.line, ms.layout, ms.short_form, al.latitude, al.longitude
                FROM metro_station ms
                JOIN additional_location al ON ms.station_name = al.location;
            """,
            "bus_stop": """
                SELECT bs.stop_name AS name, bs.num_trips_in_stop, bs.boothcode, l.latitude, l.longitude
                FROM bus_stops bs
                JOIN location l ON bs.stop_name = l.location;
            """,
            "restaurant": """
                SELECT r.name, r.address, l.latitude, l.longitude, r.phone, r.rate, r.online_order, r.book_table, 
                       r.votes, r.location, r.rest_type, r.dish_liked, r.cuisines, r.approx_cost, r.listed_in
                FROM restaurant r
                JOIN location l ON r.location = l.location;
            """
        }
        
        if utility_type in queries:
            cursor.execute(queries[utility_type])

            for row in cursor.fetchall():
                location = (row["latitude"], row["longitude"])
                user_location = (user_lat, user_lon)
                distance = geopy.distance.distance(user_location, location).km
                if distance <= max_distance:
                    row["distance"] = round(distance, 2)

                    if utility_type == "bus_stop":
                        cursor.execute(""" 
                            SELECT b.bus_name
                            FROM bus_arrival b
                            WHERE b.stop_name = %s;
                        """, (row["name"],))
                        buses = cursor.fetchall()
                        row["buses"] = [bus["bus_name"] for bus in buses]

                    utilities.append(row)

        cursor.close()
        conn.close()

    return utilities

@app.route('/get_utilities', methods=['GET'])
def get_utilities_route():
    utility_type = request.args.get('type')
    max_distance_str = request.args.get('distance')
    user_lat = float(request.args.get('lat'))
    user_lon = float(request.args.get('lon'))

    try:
        max_distance = float(max_distance_str) if max_distance_str else 10.0
    except ValueError:
        max_distance = 10.0

    utilities = get_utilities(utility_type, max_distance, user_lat, user_lon)
    return jsonify(utilities)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
