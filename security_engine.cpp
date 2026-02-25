#include <iostream>
#include <string>
#include <functional>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <vector>
#include <algorithm>
#include <limits>

using namespace std;

// ==================== USER CLASS ====================
class User {
private:
    string username;
    string passwordHash;
    string email;
    int failedAttempts;
    bool isLocked;
    long long lastAttemptTime;
    
public:
    User() : failedAttempts(0), isLocked(false), lastAttemptTime(0) {}
    
    User(string username, string password, string email) 
        : username(username), email(email), failedAttempts(0), 
          isLocked(false), lastAttemptTime(0) {
        this->passwordHash = hashPassword(password);
    }
    
    string getUsername() const { return username; }
    string getPasswordHash() const { return passwordHash; }
    string getEmail() const { return email; }
    int getFailedAttempts() const { return failedAttempts; }
    bool getLockedStatus() const { return isLocked; }
    long long getLastAttemptTime() const { return lastAttemptTime; }
    
    void setPassword(string newPassword) {
        passwordHash = hashPassword(newPassword);
    }
    
    void incrementFailedAttempts() { failedAttempts++; }
    void resetFailedAttempts() { failedAttempts = 0; }
    void lockAccount() { isLocked = true; }
    
    void unlockAccount() { 
        isLocked = false; 
        failedAttempts = 0;
    }
    
    void setLastAttemptTime(long long time) { lastAttemptTime = time; }
    
    static string hashPassword(string password) {
        hash<string> hasher;
        size_t hash = hasher(password);
        stringstream ss;
        ss << hex << setw(16) << setfill('0') << hash;
        return ss.str();
    }
    
    bool verifyPassword(string password) const {
        return hashPassword(password) == passwordHash;
    }
};

// ==================== NODE TEMPLATE ====================
template <typename T>
class Node {
public:
    T data;
    Node* next;
    
    Node(T value) : data(value), next(nullptr) {}
};

// ==================== LINKED LIST TEMPLATE ====================
template <typename T>
class LinkedList {
private:
    Node<T>* head;
    int size;
    
public:
    LinkedList() : head(nullptr), size(0) {}
    
    ~LinkedList() {
        while (head != nullptr) {
            Node<T>* temp = head;
            head = head->next;
            delete temp;
        }
    }
    
    void insert(T value) {
        Node<T>* newNode = new Node<T>(value);
        newNode->next = head;
        head = newNode;
        size++;
    }
    
    bool remove(T value) {
        if (head == nullptr) return false;
        
        if (head->data == value) {
            Node<T>* temp = head;
            head = head->next;
            delete temp;
            size--;
            return true;
        }
        
        Node<T>* current = head;
        while (current->next != nullptr) {
            if (current->next->data == value) {
                Node<T>* temp = current->next;
                current->next = current->next->next;
                delete temp;
                size--;
                return true;
            }
            current = current->next;
        }
        return false;
    }
    
    bool contains(T value) {
        Node<T>* current = head;
        while (current != nullptr) {
            if (current->data == value) return true;
            current = current->next;
        }
        return false;
    }
    
    int getSize() { return size; }
    
    void display() {
        Node<T>* current = head;
        while (current != nullptr) {
            cout << current->data << " -> ";
            current = current->next;
        }
        cout << "NULL" << endl;
    }
};

// ==================== QUEUE TEMPLATE ====================
template <typename T>
class Queue {
private:
    struct QueueNode {
        T data;
        QueueNode* next;
        QueueNode(T value) : data(value), next(nullptr) {}
    };
    
    QueueNode* front;
    QueueNode* rear;
    int size;
    int maxSize;
    
public:
    Queue(int max = 10) : front(nullptr), rear(nullptr), size(0), maxSize(max) {}
    
    ~Queue() {
        while (front != nullptr) {
            QueueNode* temp = front;
            front = front->next;
            delete temp;
        }
    }
    
    void enqueue(T value) {
        if (size >= maxSize) {
            dequeue();
        }
        
        QueueNode* newNode = new QueueNode(value);
        if (rear == nullptr) {
            front = rear = newNode;
        } else {
            rear->next = newNode;
            rear = newNode;
        }
        size++;
    }
    
    T dequeue() {
        if (isEmpty()) {
            throw runtime_error("Queue is empty");
        }
        
        QueueNode* temp = front;
        T value = front->data;
        front = front->next;
        
        if (front == nullptr) {
            rear = nullptr;
        }
        
        delete temp;
        size--;
        return value;
    }
    
    bool isEmpty() { return front == nullptr; }
    bool isFull() { return size >= maxSize; }
    int getSize() { return size; }
    
    void display() {
        QueueNode* current = front;
        while (current != nullptr) {
            cout << current->data << " ";
            current = current->next;
        }
        cout << endl;
    }
};

// ==================== HASH ENTRY ====================
template <typename K, typename V>
class HashEntry {
public:
    K key;
    V value;
    bool isOccupied;
    bool isDeleted;
    
    HashEntry() : isOccupied(false), isDeleted(false) {}
    HashEntry(K k, V v) : key(k), value(v), isOccupied(true), isDeleted(false) {}
};

// ==================== HASH TABLE TEMPLATE ====================
template <typename K, typename V>
class HashTable {
private:
    HashEntry<K, V>* table;
    int capacity;
    int count;
    const double LOAD_FACTOR = 0.75;
    
    int hashFunction(K key) {
        hash<K> hashObj;
        return abs(static_cast<int>(hashObj(key))) % capacity;
    }
    
    int probe(int index, K key) {
        int i = 1;
        int originalIndex = index;
        
        while (table[index].isOccupied && !table[index].isDeleted && 
               table[index].key != key) {
            index = (originalIndex + i * i) % capacity;
            i++;
        }
        return index;
    }
    
    void resize() {
        int oldCapacity = capacity;
        HashEntry<K, V>* oldTable = table;
        
        capacity *= 2;
        table = new HashEntry<K, V>[capacity];
        count = 0;
        
        for (int i = 0; i < oldCapacity; i++) {
            if (oldTable[i].isOccupied && !oldTable[i].isDeleted) {
                insert(oldTable[i].key, oldTable[i].value);
            }
        }
        
        delete[] oldTable;
    }
    
public:
    HashTable(int size = 10) {
        capacity = size;
        table = new HashEntry<K, V>[capacity];
        count = 0;
    }
    
    ~HashTable() {
        delete[] table;
    }
    
    void insert(K key, V value) {
        if ((double)count / capacity >= LOAD_FACTOR) {
            resize();
        }
        
        int index = hashFunction(key);
        index = probe(index, key);
        
        if (!table[index].isOccupied || table[index].isDeleted) {
            table[index] = HashEntry<K, V>(key, value);
            count++;
        } else {
            table[index].value = value;
        }
    }
    
    V* find(K key) {
        int index = hashFunction(key);
        int originalIndex = index;
        int i = 1;
        
        while (table[index].isOccupied) {
            if (!table[index].isDeleted && table[index].key == key) {
                return &table[index].value;
            }
            index = (originalIndex + i * i) % capacity;
            i++;
            
            if (i > capacity) break;
        }
        
        return nullptr;
    }
    
    bool remove(K key) {
        int index = hashFunction(key);
        int originalIndex = index;
        int i = 1;
        
        while (table[index].isOccupied) {
            if (!table[index].isDeleted && table[index].key == key) {
                table[index].isDeleted = true;
                count--;
                return true;
            }
            index = (originalIndex + i * i) % capacity;
            i++;
            
            if (i > capacity) break;
        }
        
        return false;
    }
    
    int getCount() { return count; }
    
    void display() {
        for (int i = 0; i < capacity; i++) {
            if (table[i].isOccupied && !table[i].isDeleted) {
                cout << "[" << i << "]: " << table[i].key << endl;
            } else if (table[i].isDeleted) {
                cout << "[" << i << "]: DELETED" << endl;
            } else {
                cout << "[" << i << "]: EMPTY" << endl;
            }
        }
    }
};

// ==================== LOGIN ATTEMPT STRUCT ====================
struct LoginAttempt {
    string username;
    string ipAddress;
    long long timestamp;
    bool success;
    
    LoginAttempt(string u, string ip, bool s) 
        : username(u), ipAddress(ip), success(s) {
        timestamp = chrono::system_clock::now().time_since_epoch().count();
    }
};

// ==================== AUTH SYSTEM CLASS ====================
class AuthSystem {
private:
    HashTable<string, User*> users;
    HashTable<string, Queue<LoginAttempt>*> loginHistory;
    HashTable<string, LinkedList<string>*> userSessions;
    
    const int MAX_FAILED_ATTEMPTS = 5;
    const int LOCKOUT_DURATION = 300;
    const int RATE_LIMIT = 3;
    const int COMMON_PASSWORD_LIST_SIZE = 10;
    
    vector<string> commonPasswords;
    
    bool isRateLimited(string username) {
        Queue<LoginAttempt>** history = loginHistory.find(username);
        if (history == nullptr || *history == nullptr) return false;
        
        // Simplified rate limiting check
        return (*history)->getSize() >= RATE_LIMIT;
    }
    
    bool isCommonPassword(string password) {
        return find(commonPasswords.begin(), commonPasswords.end(), password) 
               != commonPasswords.end();
    }
    
    long long getCurrentTime() {
        return chrono::system_clock::now().time_since_epoch().count();
    }
    
public:
    AuthSystem() : users(100), loginHistory(50), userSessions(50) {
        commonPasswords = {
            "password", "123456", "qwerty", "abc123", 
            "password123", "admin", "letmein", "welcome",
            "monkey", "dragon"
        };
    }
    
    ~AuthSystem() {
        // Cleanup code would go here
    }
    
    bool registerUser(string username, string password, string email) {
        if (users.find(username) != nullptr) {
            cout << "❌ Username already exists!" << endl;
            return false;
        }
        
        if (password.length() < 8) {
            cout << "❌ Password must be at least 8 characters long!" << endl;
            return false;
        }
        
        if (isCommonPassword(password)) {
            cout << "❌ This password is too common and easily guessable!" << endl;
            return false;
        }
        
        User* newUser = new User(username, password, email);
        users.insert(username, newUser);
        loginHistory.insert(username, new Queue<LoginAttempt>(20));
        userSessions.insert(username, new LinkedList<string>());
        
        cout << "✅ User registered successfully!" << endl;
        return true;
    }
    
    bool login(string username, string password, string ipAddress) {
        User** userPtr = users.find(username);
        if (userPtr == nullptr) {
            cout << "❌ User not found!" << endl;
            return false;
        }
        
        User* user = *userPtr;
        
        if (user->getLockedStatus()) {
            long long lockTime = user->getLastAttemptTime();
            long long currentTime = getCurrentTime();
            
            if ((currentTime - lockTime) > (LOCKOUT_DURATION * 1000000000LL)) {
                user->unlockAccount();
                cout << "🔓 Account auto-unlocked after lockout period." << endl;
            } else {
                cout << "🔒 Account is locked due to too many failed attempts. Try again later." << endl;
                return false;
            }
        }
        
        if (isRateLimited(username)) {
            cout << "⏱️ Too many login attempts. Please wait." << endl;
            return false;
        }
        
        bool loginSuccess = user->verifyPassword(password);
        
        Queue<LoginAttempt>** history = loginHistory.find(username);
        if (history != nullptr && *history != nullptr) {
            (*history)->enqueue(LoginAttempt(username, ipAddress, loginSuccess));
        }
        
        if (loginSuccess) {
            user->resetFailedAttempts();
            user->setLastAttemptTime(0);
            
            string sessionId = username + to_string(getCurrentTime());
            LinkedList<string>** sessions = userSessions.find(username);
            if (sessions != nullptr && *sessions != nullptr) {
                (*sessions)->insert(sessionId);
            }
            
            cout << "✅ Login successful! Session ID: " << sessionId << endl;
            
            if (checkBreach(username)) {
                cout << "⚠️ WARNING: Suspicious activity detected on this account!" << endl;
            }
            
            return true;
        } else {
            user->incrementFailedAttempts();
            user->setLastAttemptTime(getCurrentTime());
            
            if (user->getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                user->lockAccount();
                cout << "🔒 Account locked due to too many failed attempts!" << endl;
            } else {
                cout << "❌ Invalid password! Attempts remaining: " 
                     << (MAX_FAILED_ATTEMPTS - user->getFailedAttempts()) << endl;
            }
            
            return false;
        }
    }
    
    void logout(string username, string sessionId) {
        LinkedList<string>** sessions = userSessions.find(username);
        if (sessions != nullptr && *sessions != nullptr && (*sessions)->contains(sessionId)) {
            (*sessions)->remove(sessionId);
            cout << "✅ Logged out successfully!" << endl;
        } else {
            cout << "❌ Invalid session!" << endl;
        }
    }
    
    bool changePassword(string username, string oldPassword, string newPassword) {
        User** userPtr = users.find(username);
        if (userPtr == nullptr) {
            cout << "❌ User not found!" << endl;
            return false;
        }
        
        User* user = *userPtr;
        
        if (!user->verifyPassword(oldPassword)) {
            cout << "❌ Current password is incorrect!" << endl;
            return false;
        }
        
        if (isCommonPassword(newPassword)) {
            cout << "❌ New password is too common! Choose a stronger password." << endl;
            return false;
        }
        
        user->setPassword(newPassword);
        cout << "✅ Password changed successfully!" << endl;
        return true;
    }
    
    void lockUser(string username) {
        User** userPtr = users.find(username);
        if (userPtr != nullptr) {
            (*userPtr)->lockAccount();
            cout << "🔒 User " << username << " has been locked." << endl;
        }
    }
    
    void unlockUser(string username) {
        User** userPtr = users.find(username);
        if (userPtr != nullptr) {
            (*userPtr)->unlockAccount();
            cout << "🔓 User " << username << " has been unlocked." << endl;
        }
    }
    
    bool checkBreach(string username) {
        User** userPtr = users.find(username);
        if (userPtr == nullptr) return false;
        
        User* user = *userPtr;
        
        if (user->getFailedAttempts() > 3) {
            cout << "⚠️ Alert: Multiple failed login attempts detected." << endl;
            return true;
        }
        
        Queue<LoginAttempt>** history = loginHistory.find(username);
        if (history != nullptr && *history != nullptr && (*history)->getSize() > 5) {
            cout << "⚠️ Alert: Unusual login activity detected." << endl;
            return true;
        }
        
        return false;
    }
    
    void displayAllUsers() {
        cout << "\n=== Registered Users ===" << endl;
        users.display();
    }
    
    void displayLoginHistory(string username) {
        Queue<LoginAttempt>** history = loginHistory.find(username);
        if (history == nullptr || *history == nullptr) {
            cout << "No login history found for " << username << endl;
            return;
        }
        
        cout << "\n=== Login History for " << username << " ===" << endl;
        cout << "Recent attempts: " << (*history)->getSize() << endl;
    }
};

// ==================== HELPER FUNCTIONS ====================
void clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

void waitForEnter() {
    cout << "\nPress Enter to continue...";
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
    cin.get();
}

void displayMenu() {
    cout << "\n🔐 === SMART ACCOUNT BREACH PROTECTION SYSTEM === 🔐" << endl;
    cout << "╔════════════════════════════════════════════════╗" << endl;
    cout << "║  1. Register New User                          ║" << endl;
    cout << "║  2. Login                                       ║" << endl;
    cout << "║  3. Change Password                             ║" << endl;
    cout << "║  4. Lock User Account (Admin)                   ║" << endl;
    cout << "║  5. Unlock User Account (Admin)                 ║" << endl;
    cout << "║  6. Display All Users                           ║" << endl;
    cout << "║  7. Check Account Breach Status                 ║" << endl;
    cout << "║  8. Exit                                         ║" << endl;
    cout << "╚════════════════════════════════════════════════╝" << endl;
    cout << "Enter your choice: ";
}

// ==================== MAIN FUNCTION ====================
int main(int argc, char* argv[]) {
    AuthSystem authSystem;
    string username, password, email, ip, sessionId, oldPassword, newPassword;
    int choice;
    
    // Add demo users
    authSystem.registerUser("admin", "SecurePass123!", "admin@example.com");
    authSystem.registerUser("user1", "MyPassword456!", "user1@example.com");

    // CLI MODE: Support for Node.js integration
    if (argc > 1) {
        string flag = argv[1];
        if (flag == "--version") {
            cout << "1.0.0" << endl;
            return 0;
        }
        if (flag == "--check-breach" && argc > 2) {
            string checkUser = argv[2];
            if (authSystem.checkBreach(checkUser)) {
                cout << "BREACH_DETECTED" << endl;
            } else {
                cout << "STATUS_SECURE" << endl;
            }
            return 0;
        }
        return 1;
    }

    // CONSOLE MODE: Interactive menu
    clearScreen();
    cout << "╔════════════════════════════════════════════════╗" << endl;
    cout << "║   WELCOME TO BREACH PROTECTION SYSTEM v1.0    ║" << endl;
    cout << "║     Protecting your accounts since 2024        ║" << endl;
    cout << "╚════════════════════════════════════════════════╝" << endl;
    cout << "Initializing security protocols..." << endl;
    cout << "✅ Demo accounts created!" << endl;
    
    while (true) {
        displayMenu();
        cin >> choice;
        
        switch (choice) {
            case 1:
                clearScreen();
                cout << "\n📝 === REGISTER NEW USER ===" << endl;
                cout << "Username: ";
                cin >> username;
                cout << "Password (min 8 chars, avoid common passwords): ";
                cin >> password;
                cout << "Email: ";
                cin >> email;
                
                authSystem.registerUser(username, password, email);
                waitForEnter();
                break;
                
            case 2:
                clearScreen();
                cout << "\n🔑 === USER LOGIN ===" << endl;
                cout << "Username: ";
                cin >> username;
                cout << "Password: ";
                cin >> password;
                cout << "IP Address (simulated, e.g., 192.168.1.1): ";
                cin >> ip;
                
                authSystem.login(username, password, ip);
                waitForEnter();
                break;
                
            case 3:
                clearScreen();
                cout << "\n🔄 === CHANGE PASSWORD ===" << endl;
                cout << "Username: ";
                cin >> username;
                cout << "Old Password: ";
                cin >> oldPassword;
                cout << "New Password: ";
                cin >> newPassword;
                
                authSystem.changePassword(username, oldPassword, newPassword);
                waitForEnter();
                break;
                
            case 4:
                clearScreen();
                cout << "\n🔒 === LOCK USER ACCOUNT (ADMIN) ===" << endl;
                cout << "Username to lock: ";
                cin >> username;
                
                authSystem.lockUser(username);
                waitForEnter();
                break;
                
            case 5:
                clearScreen();
                cout << "\n🔓 === UNLOCK USER ACCOUNT (ADMIN) ===" << endl;
                cout << "Username to unlock: ";
                cin >> username;
                
                authSystem.unlockUser(username);
                waitForEnter();
                break;
                
            case 6:
                clearScreen();
                authSystem.displayAllUsers();
                waitForEnter();
                break;
                
            case 7:
                clearScreen();
                cout << "\n⚠️ === CHECK BREACH STATUS ===" << endl;
                cout << "Username: ";
                cin >> username;
                
                if (authSystem.checkBreach(username)) {
                    cout << "⚠️  WARNING: Potential breach detected!" << endl;
                } else {
                    cout << "✅ Account appears secure." << endl;
                }
                waitForEnter();
                break;
                
            case 8:
                cout << "\n👋 Exiting system. Stay secure!" << endl;
                return 0;
                
            default:
                cout << "❌ Invalid choice! Please try again." << endl;
                waitForEnter();
        }
        
        clearScreen();
    }
    
    return 0;
}
